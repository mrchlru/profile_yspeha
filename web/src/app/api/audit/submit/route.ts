import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import {
  isAuditAccessTestKind,
  isProctorTestKind,
  isTestKind,
  shouldMarkAccessInviteUsedAfterAuditSubmit,
  TEST_KIND_SCREENING,
  type TestKind,
} from "@/lib/access/testKinds";
import type { AccessInviteCheckResult } from "@/lib/access/findActiveInvite";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { runAuditSubmitReportPipeline } from "@/lib/audit/runAuditSubmitReportPipeline";
import { auditSubmitBodySchema } from "@/lib/validation/auditSubmitSchema";

export const dynamic = "force-dynamic";

/**
 * Принимает ответы аудита состояния, сохраняет `AuditSubmission`,
 * помечает код доступа использованным и формирует отчёт (скоринг, ИИ, PDF, email).
 *
 * Идемпотентен относительно повторов по `sessionId` для записи ответов;
 * отчёт пересчитывается при каждом успешном теле запроса.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("audit_submit", "json_parse_failed", { sessionRef: "unknown" });
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = auditSubmitBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("audit_submit", "validation_failed", {
      sessionRef: sessionHint,
      issues: JSON.stringify(zodIssuesForLog(parsed.error)),
    });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const payload = parsed.data;
  const sessionRef = shortSessionRef(payload.sessionId);

  const assessee = buildAuditAssesseeKey({
    firstName: payload.firstName,
    lastName: payload.lastName,
  });
  if (assessee === null) {
    screeningServerLog("audit_submit", "name_empty_after_normalize", { sessionRef });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok" && invite.status !== "used") {
    screeningServerLog("audit_submit", "invalid_access_code", {
      sessionRef,
      inviteStatus: invite.status,
    });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }
  if (invite.status === "ok" && !isAuditAccessTestKind(invite.testKind)) {
    screeningServerLog("audit_submit", "wrong_test_kind", { sessionRef });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const consentAt = new Date(payload.consentRecordedAt);
  const candidateFolderKey = await _resolveCandidateFolderKeyForSubmit(payload.accessCode);
  const dbStarted = Date.now();
  try {
    await prisma.auditSubmission.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        assesseeKey: assessee.key,
        assesseeKeyVer: assessee.version,
        firstName: assessee.firstNameDisplay,
        lastName: assessee.lastNameDisplay,
        personalDataConsent: payload.personalDataConsent,
        consentRecordedAt: consentAt,
        answers: payload.answers as Prisma.InputJsonValue,
        candidateFolderKey,
      },
      update: {
        assesseeKey: assessee.key,
        assesseeKeyVer: assessee.version,
        firstName: assessee.firstNameDisplay,
        lastName: assessee.lastNameDisplay,
        personalDataConsent: payload.personalDataConsent,
        consentRecordedAt: consentAt,
        answers: payload.answers as Prisma.InputJsonValue,
        candidateFolderKey,
      },
    });
    screeningServerLog("audit_submit", "db_upsert_ok", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
    });
  } catch (err) {
    screeningServerLog("audit_submit", "db_upsert_failed", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  if (
    invite.status === "ok" &&
    shouldMarkAccessInviteUsedAfterAuditSubmit(invite.testKind)
  ) {
    try {
      const marked = await markAccessCodeUsed(payload.accessCode, invite.testKind);
      screeningServerLog("audit_submit", "access_code_marked_used", {
        sessionRef,
        marked,
        testKind: invite.testKind,
      });
    } catch (err) {
      screeningServerLog("audit_submit", "access_code_mark_use_failed", {
        sessionRef,
        testKind: invite.testKind,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  const submitTestKind = await _resolveSubmitTestKind(payload.accessCode, invite);

  if (isProctorTestKind(submitTestKind)) {
    try {
      await finalizeProctorSessionIfNeeded(payload.sessionId, submitTestKind);
    } catch (err) {
      screeningServerLog("audit_submit", "proctor_finalize_failed", {
        sessionRef,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  void runAuditSubmitReportPipeline({
    payload,
    sessionRef,
    assessee,
    invite,
    consentAt,
    submitTestKind,
    pipelineStartedAt: startedAt,
  }).catch((err) => {
    screeningServerLog("audit_submit", "background_pipeline_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  });

  screeningServerLog("audit_submit", "accepted_fast", {
    sessionRef,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

async function _resolveSubmitTestKind(
  accessCode: string,
  invite: AccessInviteCheckResult
): Promise<TestKind | null> {
  if (invite.status === "ok") {
    return invite.testKind;
  }
  const row = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(accessCode) },
    select: { testKind: true },
  });
  if (row !== null && isTestKind(row.testKind)) {
    return row.testKind;
  }
  return null;
}

/** Возвращает ключ папки кандидата для батареи скрининга (audit submit). */
async function _resolveCandidateFolderKeyForSubmit(accessCode: string): Promise<string | null> {
  const row = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(accessCode) },
    select: { testKind: true, candidateFolderKey: true },
  });
  if (row === null || row.testKind !== TEST_KIND_SCREENING) {
    return null;
  }
  return row.candidateFolderKey ?? null;
}
