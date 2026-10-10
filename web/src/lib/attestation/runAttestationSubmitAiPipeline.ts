import { sendAttestationCompletionEmail } from "@/lib/email/sendAttestationCompletionEmail";
import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { persistAttestationAiConclusion } from "@/lib/attestation/persistAttestationAiConclusion";
import { persistRosenzweigAiCoding } from "@/lib/attestation/persistRosenzweigAiCoding";
import type { AttestationComputedScores } from "@/lib/attestation/computeAttestationScores";

export type RunAttestationSubmitAiPipelineInput = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  scores: AttestationComputedScores;
  pipelineStartedAt: number;
};

/**
 * Фоновый пайплайн аттестации: ИИ-кодирование Розенцвейга → заключение → письмо HR.
 */
export async function runAttestationSubmitAiPipeline(
  input: RunAttestationSubmitAiPipelineInput
): Promise<void> {
  const { sessionId, sessionRef, fullName, scores, pipelineStartedAt } = input;

  const codingStarted = Date.now();
  try {
    const codingResult = await persistRosenzweigAiCoding({
      sessionId,
      sessionRef,
      personName: fullName,
      force: false,
    });
    screeningServerLog("attestation_submit", "ai_rosenzweig_finished", {
      sessionRef,
      ok: codingResult.aiGenerated || codingResult.skippedExisting,
      aiGenerated: codingResult.aiGenerated,
      skippedExisting: codingResult.skippedExisting,
      codedCount: codingResult.codedCount,
      durationMs: Date.now() - codingStarted,
    });
  } catch (err) {
    screeningServerLog("attestation_submit", "ai_rosenzweig_exception", {
      sessionRef,
      durationMs: Date.now() - codingStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  const aiStarted = Date.now();
  let conclusionText: string | null = null;
  let managerActions: string | null = null;
  try {
    const persisted = await persistAttestationAiConclusion({
      sessionId,
      sessionRef,
      personName: fullName,
    });
    conclusionText = persisted.conclusionText;
    managerActions = persisted.managerActions;
    screeningServerLog("attestation_submit", "ai_conclusion_finished", {
      sessionRef,
      ok: conclusionText !== null,
      durationMs: Date.now() - aiStarted,
    });
  } catch (err) {
    screeningServerLog("attestation_submit", "ai_conclusion_exception", {
      sessionRef,
      durationMs: Date.now() - aiStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  const emailStarted = Date.now();
  try {
    const emailSent = await sendAttestationCompletionEmail({
      sessionId,
      sessionRef,
      fullName,
      scores,
      conclusionText,
      managerActions,
    });
    screeningServerLog("attestation_submit", "email_finished", {
      sessionRef,
      sent: emailSent,
      durationMs: Date.now() - emailStarted,
    });
  } catch (err) {
    const smtpFields = smtpErrorLogFields(err);
    screeningServerLog("attestation_submit", "email_exception", {
      sessionRef,
      durationMs: Date.now() - emailStarted,
      errorName: smtpFields.errorName,
      errorMessage: smtpFields.errorMessage,
      responseCode: smtpFields.responseCode ?? undefined,
    });
  }

  screeningServerLog("attestation_submit", "background_success", {
    sessionRef,
    totalDurationMs: Date.now() - pipelineStartedAt,
  });
}
