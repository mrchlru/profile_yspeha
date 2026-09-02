import { Prisma } from "@/generated/prisma/client";
import { buildScreeningConclusionContext } from "@/lib/ai/buildScreeningConclusionContext";
import { generateScreeningConclusion } from "@/lib/ai/kotConclusion";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import {
  sendScreeningReportEmail,
  smtpErrorLogFields,
} from "@/lib/email/sendScreeningReportEmail";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { countKotRawScore, getKotIpLevelLabel, getKotIpNormNote } from "@/lib/kot/kotScore";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";
import { generateScreeningPdfBuffer } from "@/lib/report/generateScreeningPdf";
import type { Step1Data, Step2Data, Step3Data, Step4Data } from "@/store/useFormStore";
import type { z } from "zod";
import type { submitApiBodySchema } from "@/lib/validation/submitPayloadSchema";

type ScreeningSubmitPayload = z.infer<typeof submitApiBodySchema>;

export type RunScreeningSubmitReportPipelineInput = {
  payload: ScreeningSubmitPayload;
  sessionRef: string;
  profileName: string;
  pipelineStartedAt: number;
};

/**
 * Фоновый пайплайн скрининга: ИИ, PDF, email и обновление kotReport.
 */
export async function runScreeningSubmitReportPipeline(
  input: RunScreeningSubmitReportPipelineInput
): Promise<void> {
  const { payload, sessionRef, profileName, pipelineStartedAt } = input;
  const step1 = payload.step1Data as Step1Data;
  const step2 = payload.step2Data as Step2Data;
  const step3 = payload.step3Data as Step3Data;
  const step4 = payload.step4Data as Step4Data;

  const rawScore = countKotRawScore(step1);
  const maxScore = KOT_STEP_QUESTION_COUNT;
  const kotIpNormNote = getKotIpNormNote();
  const kotIpLevelLabel = getKotIpLevelLabel(rawScore);
  const screeningContext = buildScreeningConclusionContext({
    rawScore,
    maxScore,
    kotIpLevelLabel,
    kotIpNormNote,
    profileName,
    step2,
    step3,
    step4,
  });

  let conclusionText: string | null = null;
  let hiringRecommendations: string | null = null;
  let conclusionGeneratedAt: string | null = null;
  const aiStarted = Date.now();
  try {
    const aiResult = await generateScreeningConclusion({
      screeningContext,
      sessionRef,
    });
    conclusionText = aiResult.conclusion;
    hiringRecommendations = aiResult.hiringRecommendations;
    if (conclusionText !== null) {
      conclusionGeneratedAt = formatMoscowNow();
    }
    screeningServerLog("submit", "ai_conclusion_finished", {
      sessionRef,
      ok: conclusionText !== null,
      durationMs: Date.now() - aiStarted,
    });
  } catch (err) {
    screeningServerLog("submit", "ai_conclusion_exception", {
      sessionRef,
      durationMs: Date.now() - aiStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  let reportPdfBuffer: Buffer | null = null;
  const pdfStarted = Date.now();
  try {
    reportPdfBuffer = await generateScreeningPdfBuffer({
      profileName,
      sessionId: payload.sessionId,
      rawScore,
      maxScore,
      kotIp: rawScore,
      kotIpLevelLabel,
      kotIpNormNote,
      step1,
      step2,
      step3,
      step4,
      conclusionText,
      hiringRecommendations,
    });
    screeningServerLog("submit", "pdf_ok", {
      sessionRef,
      bytes: reportPdfBuffer.length,
      durationMs: Date.now() - pdfStarted,
    });
  } catch (err) {
    screeningServerLog("submit", "pdf_failed", {
      sessionRef,
      durationMs: Date.now() - pdfStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    reportPdfBuffer = null;
  }

  const emailStarted = Date.now();
  let emailSent = false;
  try {
    emailSent = await sendScreeningReportEmail({
      sessionId: payload.sessionId,
      profileName,
      rawScore,
      maxScore,
      kotIp: rawScore,
      kotIpLevelLabel,
      kotIpNormNote,
      conclusionText,
      hiringRecommendations,
      reportPdfBuffer,
      sessionRef,
    });
    screeningServerLog("submit", "email_finished", {
      sessionRef,
      sent: emailSent,
      durationMs: Date.now() - emailStarted,
    });
  } catch (err) {
    const smtpFields = smtpErrorLogFields(err);
    screeningServerLog("submit", "email_exception", {
      sessionRef,
      durationMs: Date.now() - emailStarted,
      errorName: smtpFields.errorName,
      errorMessage: smtpFields.errorMessage,
      responseCode: smtpFields.responseCode ?? undefined,
    });
  }

  const kotReport: KotReportJson = {
    version: 4,
    rawScore,
    maxScore,
    kotIp: rawScore,
    kotIpLevelLabel,
    kotIpNormNote,
    conclusionText,
    hiringRecommendations,
    conclusionGeneratedAt,
    emailSent,
    pdfAttached: reportPdfBuffer !== null,
  };

  try {
    await prisma.screeningSubmission.update({
      where: { sessionId: payload.sessionId },
      data: { kotReport: kotReport as unknown as Prisma.InputJsonValue },
    });
    screeningServerLog("submit", "kot_report_updated", { sessionRef });
  } catch (err) {
    screeningServerLog("submit", "kot_report_update_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  screeningServerLog("submit", "background_success", {
    sessionRef,
    totalDurationMs: Date.now() - pipelineStartedAt,
  });
}
