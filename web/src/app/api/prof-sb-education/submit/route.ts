import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import { isProfSbEducationTestKind, TEST_KIND_PROF_SB_EDUCATION } from "@/lib/access/testKinds";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { buildPendingProfSbEducationReport } from "@/lib/profSbEducation/profSbEducationTypes";
import { prisma } from "@/lib/prisma";
import { profSbEducationSubmitBodySchema } from "@/lib/validation/profSbEducationSubmitSchema";

export const dynamic = "force-dynamic";

/**
 * Принимает ответы анкеты «ПРОФ СБ + ПРОФ образование» и сохраняет сессию.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("prof_sb_education_submit", "json_parse_failed", { sessionRef: "unknown" });
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = profSbEducationSubmitBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("prof_sb_education_submit", "validation_failed", {
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
    screeningServerLog("prof_sb_education_submit", "name_empty_after_normalize", { sessionRef });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok" && invite.status !== "used") {
    screeningServerLog("prof_sb_education_submit", "invalid_access_code", {
      sessionRef,
      inviteStatus: invite.status,
    });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }
  if (invite.status === "ok" && !isProfSbEducationTestKind(invite.testKind)) {
    screeningServerLog("prof_sb_education_submit", "wrong_test_kind", { sessionRef });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const inviteMeta = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(payload.accessCode) },
    select: { candidateFolderKey: true },
  });
  const candidateFolderKey = inviteMeta?.candidateFolderKey ?? null;

  const profReport = {
    ...buildPendingProfSbEducationReport(),
    computedAt: formatMoscowNow(),
  };

  const consentAt = new Date(payload.consentRecordedAt);
  const dbStarted = Date.now();
  try {
    await prisma.profSbEducationSubmission.upsert({
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
        profReport: profReport as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
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
        profReport: profReport as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
      },
    });
  } catch (err) {
    screeningServerLog("prof_sb_education_submit", "db_error", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
      dbMs: Date.now() - dbStarted,
    });
    return NextResponse.json({ error: "Не удалось сохранить ответы" }, { status: 500 });
  }

  if (invite.status === "ok") {
    try {
      await markAccessCodeUsed(payload.accessCode, TEST_KIND_PROF_SB_EDUCATION);
    } catch (err) {
      screeningServerLog("prof_sb_education_submit", "access_code_mark_used_failed", {
        sessionRef,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  screeningServerLog("prof_sb_education_submit", "ok", {
    sessionRef,
    totalMs: Date.now() - startedAt,
    dbMs: Date.now() - dbStarted,
  });

  try {
    await finalizeProctorSessionIfNeeded(payload.sessionId, TEST_KIND_PROF_SB_EDUCATION);
  } catch (err) {
    screeningServerLog("prof_sb_education_submit", "proctor_finalize_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}
