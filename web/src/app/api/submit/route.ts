import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/api/clientIp";
import {
  isSubmitRateLimitExceeded,
  recordSuccessfulSubmit,
} from "@/lib/api/submitRateLimit";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { maskClientIp } from "@/lib/logging/maskClientIp";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { runScreeningSubmitReportPipeline } from "@/lib/screening/runScreeningSubmitReportPipeline";
import { prisma } from "@/lib/prisma";
import { isFullScreeningPayloadComplete } from "@/lib/validation/stepCompletion";
import { submitApiBodySchema } from "@/lib/validation/submitPayloadSchema";
import type { Step1Data, Step2Data, Step3Data, Step4Data } from "@/store/useFormStore";
import { Prisma } from "@/generated/prisma/client";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { countKotRawScore, getKotIpLevelLabel, getKotIpNormNote } from "@/lib/kot/kotScore";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

function methodNotAllowed(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export function GET(): NextResponse<{ error: string }> {
  return methodNotAllowed();
}

export function PUT(): NextResponse<{ error: string }> {
  return methodNotAllowed();
}

export function DELETE(): NextResponse<{ error: string }> {
  return methodNotAllowed();
}

export function PATCH(): NextResponse<{ error: string }> {
  return methodNotAllowed();
}

/**
 * Принимает ответы кандидата и сохраняет по session_id (upsert).
 * Логирует этапы без тела анкеты и без персональных данных (см. SECURITY.md).
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("submit", "json_parse_failed", { sessionRef: "unknown" });
    return jsonError("Invalid JSON", 400);
  }

  const parsed = submitApiBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("submit", "validation_failed", {
      sessionRef: sessionHint,
      issues: JSON.stringify(zodIssuesForLog(parsed.error)),
    });
    return jsonError("Invalid request body", 400);
  }

  const payload = parsed.data;
  const sessionRef = shortSessionRef(payload.sessionId);

  screeningServerLog("submit", "request_accepted", {
    sessionRef,
  });

  if (!payload.personalDataConsent) {
    screeningServerLog("submit", "consent_false", { sessionRef });
    return jsonError("Invalid request body", 400);
  }

  const step1 = payload.step1Data as Step1Data;
  const step2 = payload.step2Data as Step2Data;
  const step3 = payload.step3Data as Step3Data;
  const step4 = payload.step4Data as Step4Data;

  if (!isFullScreeningPayloadComplete(step1, step2, step3, step4)) {
    screeningServerLog("submit", "payload_incomplete", { sessionRef });
    return jsonError("Incomplete payload", 400);
  }

  const accessCheck = await checkAccessInvite(payload.accessCode);
  if (accessCheck.status === "expired") {
    screeningServerLog("submit", "access_code_expired", { sessionRef });
    return jsonError(
      "Срок действия кода истёк. Запросите новое приглашение и пройдите тест заново.",
      403
    );
  }
  if (accessCheck.status !== "ok" || accessCheck.testKind !== TEST_KIND_SCREENING) {
    screeningServerLog("submit", "invalid_access_code", { sessionRef });
    return jsonError("Недействительный код доступа", 403);
  }

  const clientIp = getClientIp(req);
  const ipMasked = maskClientIp(clientIp);

  if (isSubmitRateLimitExceeded(clientIp)) {
    screeningServerLog("submit", "rate_limited", { sessionRef, ipMasked });
    return jsonError("Too Many Requests", 429);
  }

  const rawScore = countKotRawScore(step1);
  const maxScore = KOT_STEP_QUESTION_COUNT;
  const kotIpNormNote = getKotIpNormNote();
  const kotIpLevelLabel = getKotIpLevelLabel(rawScore);

  screeningServerLog("submit", "kot_scored", {
    sessionRef,
    rawScore,
    maxScore,
    kotIpLevelLabel,
  });

  const kotReportDraft: KotReportJson = {
    version: 4,
    rawScore,
    maxScore,
    kotIp: rawScore,
    kotIpLevelLabel,
    kotIpNormNote,
    conclusionText: null,
    hiringRecommendations: null,
    conclusionGeneratedAt: null,
    emailSent: false,
    pdfAttached: false,
  };

  const dbStarted = Date.now();
  const inviteMeta = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(payload.accessCode) },
    select: {
      candidateFolderKey: true,
      interviewFolderKey: true,
      candidateLastName: true,
      candidateFirstName: true,
      candidateMiddleName: true,
    },
  });
  const candidateFolderKey = inviteMeta?.candidateFolderKey ?? null;
  const interviewFolderKey = inviteMeta?.interviewFolderKey ?? null;
  const profileName =
    inviteMeta?.candidateLastName && inviteMeta?.candidateFirstName
      ? [inviteMeta.candidateLastName, inviteMeta.candidateFirstName, inviteMeta.candidateMiddleName]
          .filter((part) => part && part.trim().length > 0)
          .join(" ")
      : payload.profileName;

  try {
    const consentAt = new Date(payload.consentRecordedAt);
    await prisma.screeningSubmission.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        profileName,
        personalDataConsent: payload.personalDataConsent,
        consentRecordedAt: consentAt,
        step1Data: payload.step1Data as Prisma.InputJsonValue,
        step2Data: payload.step2Data as Prisma.InputJsonValue,
        step3Data: payload.step3Data as Prisma.InputJsonValue,
        step4Data: payload.step4Data as Prisma.InputJsonValue,
        kotReport: kotReportDraft as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
        interviewFolderKey,
      },
      update: {
        profileName,
        personalDataConsent: payload.personalDataConsent,
        consentRecordedAt: consentAt,
        step1Data: payload.step1Data as Prisma.InputJsonValue,
        step2Data: payload.step2Data as Prisma.InputJsonValue,
        step3Data: payload.step3Data as Prisma.InputJsonValue,
        step4Data: payload.step4Data as Prisma.InputJsonValue,
        kotReport: kotReportDraft as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
        interviewFolderKey,
      },
    });
    recordSuccessfulSubmit(clientIp);
    screeningServerLog("submit", "db_upsert_ok", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
      ipMasked,
    });
  } catch (err) {
    screeningServerLog("submit", "db_upsert_failed", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  try {
    const marked = await markAccessCodeUsed(payload.accessCode, TEST_KIND_SCREENING);
    screeningServerLog("submit", "access_code_marked_used", {
      sessionRef,
      marked,
    });
  } catch (err) {
    screeningServerLog("submit", "access_code_mark_used_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  screeningServerLog("submit", "accepted_fast", {
    sessionRef,
    totalDurationMs: Date.now() - startedAt,
  });

  try {
    await finalizeProctorSessionIfNeeded(payload.sessionId, TEST_KIND_SCREENING);
  } catch (err) {
    screeningServerLog("submit", "proctor_finalize_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  void runScreeningSubmitReportPipeline({
    payload,
    sessionRef,
    profileName,
    pipelineStartedAt: startedAt,
  }).catch((err) => {
    screeningServerLog("submit", "background_pipeline_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
