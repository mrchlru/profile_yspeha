import { sendSpecialistScreeningCompletionEmail } from "@/lib/email/sendSpecialistScreeningCompletionEmail";
import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { persistSpecialistScreeningAiConclusion } from "@/lib/specialistScreening/persistSpecialistScreeningAiConclusion";
import type { SpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";

export type RunSpecialistScreeningSubmitAiPipelineInput = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  interpretation: SpecialistScreeningInterpretation;
  pipelineStartedAt: number;
};

/**
 * Фоновый пайплайн скрининга: ИИ, обновление отчёта и completion-email (urgent — в submit route).
 */
export async function runSpecialistScreeningSubmitAiPipeline(
  input: RunSpecialistScreeningSubmitAiPipelineInput
): Promise<void> {
  const { sessionId, sessionRef, fullName, interpretation, pipelineStartedAt } = input;

  const aiStarted = Date.now();
  let conclusionText: string | null = null;
  let managerActions: string | null = null;
  try {
    const persisted = await persistSpecialistScreeningAiConclusion({
      sessionId,
      sessionRef,
      personName: fullName,
    });
    conclusionText = persisted.conclusionText;
    managerActions = persisted.managerActions;
    screeningServerLog("specialist_screening_submit", "ai_conclusion_finished", {
      sessionRef,
      ok: conclusionText !== null,
      durationMs: Date.now() - aiStarted,
    });
  } catch (err) {
    screeningServerLog("specialist_screening_submit", "ai_conclusion_exception", {
      sessionRef,
      durationMs: Date.now() - aiStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  const emailStarted = Date.now();
  try {
    const emailSent = await sendSpecialistScreeningCompletionEmail({
      sessionId,
      sessionRef,
      fullName,
      interpretation,
      conclusionText,
      managerActions,
    });
    screeningServerLog("specialist_screening_submit", "email_finished", {
      sessionRef,
      sent: emailSent,
      durationMs: Date.now() - emailStarted,
    });
  } catch (err) {
    const smtpFields = smtpErrorLogFields(err);
    screeningServerLog("specialist_screening_submit", "email_exception", {
      sessionRef,
      durationMs: Date.now() - emailStarted,
      errorName: smtpFields.errorName,
      errorMessage: smtpFields.errorMessage,
      responseCode: smtpFields.responseCode ?? undefined,
    });
  }

  screeningServerLog("specialist_screening_submit", "background_success", {
    sessionRef,
    totalDurationMs: Date.now() - pipelineStartedAt,
  });
}
