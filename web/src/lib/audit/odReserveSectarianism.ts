import { getStepAnsweredCount, type AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";

/** Шаг теста на сектантство в маршруте аудита. */
export const OD_RESERVE_SECTARIANISM_STEP_INDEX = 26;

/**
 * Проверяет, есть ли ответы на тест на сектантство (для отчёта и выгрузок).
 */
export function hasSectarianismAnswers(answers: AuditAnswersMap | undefined): boolean {
  if (answers === undefined) {
    return false;
  }
  const sectarianStep = AUDIT_STEPS.find((step) => step.internalKey === "sectarianism_screening");
  if (sectarianStep === undefined) {
    return false;
  }
  return getStepAnsweredCount(answers[sectarianStep.stepIndex]) > 0;
}
