import { Prisma } from "@/generated/prisma/client";

import { normalizeAccessCode } from "@/lib/access/accessCode";
import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { countKotRawScore, getKotIpLevelLabel, getKotIpNormNote } from "@/lib/kot/kotScore";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { prisma } from "@/lib/prisma";
import { runScreeningSubmitReportPipeline } from "@/lib/screening/runScreeningSubmitReportPipeline";
import type { Step1Data, Step2Data, Step3Data, Step4Data } from "@/store/useFormStore";
import { isFullScreeningPayloadComplete } from "@/lib/validation/stepCompletion";
import { submitApiBodySchema } from "@/lib/validation/submitPayloadSchema";

export type RunScreeningReportPipelineForStoredInviteResult =
  | {
      ok: true;
      sessionId: string;
      skipped: true;
      skipReason: "already_complete" | "no_submission";
    }
  | {
      ok: true;
      sessionId: string;
      skipped: false;
    }
  | {
      ok: false;
      reason: "incomplete_steps" | "invalid_payload";
    };

/**
 * Строит отчёт КОТ (ИИ, PDF, email) из уже сохранённой `screening_submission` по коду.
 */
export async function runScreeningReportPipelineForStoredInvite(
  rawAccessCode: string,
  options?: { sessionRef?: string; pipelineStartedAt?: number }
): Promise<RunScreeningReportPipelineForStoredInviteResult> {
  const accessCode = normalizeAccessCode(rawAccessCode);
  const row = await prisma.screeningSubmission.findFirst({
    where: { accessInviteCode: accessCode },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      profileName: true,
      personalDataConsent: true,
      consentRecordedAt: true,
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
      kotReport: true,
    },
  });

  if (row === null) {
    return { ok: true, sessionId: "", skipped: true, skipReason: "no_submission" };
  }

  const sessionRef = options?.sessionRef ?? shortSessionRef(row.sessionId);
  const kotExisting = _parseKotReport(row.kotReport);
  if (
    kotExisting !== null &&
    kotExisting.conclusionText !== null &&
    kotExisting.emailSent === true
  ) {
    return {
      ok: true,
      sessionId: row.sessionId,
      skipped: true,
      skipReason: "already_complete",
    };
  }

  const step1 = row.step1Data as Step1Data;
  const step2 = row.step2Data as Step2Data;
  const step3 = row.step3Data as Step3Data;
  const step4 = row.step4Data as Step4Data;

  if (!isFullScreeningPayloadComplete(step1, step2, step3, step4)) {
    screeningServerLog("screening_stored_pipeline", "incomplete_steps", {
      sessionRef,
      code: accessCode,
    });
    return { ok: false, reason: "incomplete_steps" };
  }

  const parsedPayload = submitApiBodySchema.safeParse({
    sessionId: row.sessionId,
    accessCode,
    profileName: row.profileName,
    personalDataConsent: row.personalDataConsent,
    consentRecordedAt: row.consentRecordedAt.toISOString(),
    step1Data: step1,
    step2Data: step2,
    step3Data: step3,
    step4Data: step4,
  });
  if (!parsedPayload.success) {
    screeningServerLog("screening_stored_pipeline", "invalid_payload", {
      sessionRef,
      code: accessCode,
    });
    return { ok: false, reason: "invalid_payload" };
  }

  const payload = parsedPayload.data;
  const rawScore = countKotRawScore(step1);
  const kotReportDraft: KotReportJson = {
    version: 4,
    rawScore,
    maxScore: KOT_STEP_QUESTION_COUNT,
    kotIp: rawScore,
    kotIpLevelLabel: getKotIpLevelLabel(rawScore),
    kotIpNormNote: getKotIpNormNote(),
    conclusionText: kotExisting?.conclusionText ?? null,
    hiringRecommendations: kotExisting?.hiringRecommendations ?? null,
    conclusionGeneratedAt: kotExisting?.conclusionGeneratedAt ?? null,
    emailSent: false,
    pdfAttached: false,
  };

  await prisma.screeningSubmission.update({
    where: { sessionId: row.sessionId },
    data: { kotReport: kotReportDraft as unknown as Prisma.InputJsonValue },
  });

  screeningServerLog("screening_stored_pipeline", "pipeline_start", {
    sessionRef,
    code: accessCode,
  });

  const pipelineStartedAt = options?.pipelineStartedAt ?? Date.now();
  await runScreeningSubmitReportPipeline({
    payload,
    sessionRef,
    profileName: row.profileName,
    pipelineStartedAt,
  });

  try {
    await finalizeProctorSessionIfNeeded(row.sessionId, TEST_KIND_SCREENING);
  } catch (err) {
    screeningServerLog("screening_stored_pipeline", "proctor_finalize_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  screeningServerLog("screening_stored_pipeline", "pipeline_done", {
    sessionRef,
    code: accessCode,
  });

  return { ok: true, sessionId: row.sessionId, skipped: false };
}

function _parseKotReport(value: unknown): KotReportJson | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as KotReportJson;
}
