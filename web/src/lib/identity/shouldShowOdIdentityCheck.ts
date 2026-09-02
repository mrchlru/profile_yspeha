import type { OdIdentityQuestionnaire } from "@/lib/identity/odIdentityTypes";
import { isOdIdentityQuestionnaireComplete } from "@/lib/identity/odIdentityCheck";
import { isOdReserveIdentityBattery } from "@/lib/identity/isOdReserveIdentityBattery";
import type { AuditBatteryId } from "@/lib/audit/auditBatteries";

/**
 * Нужна ли проверка личности при переходе к вопросам на этом шаге.
 */
export function shouldShowOdIdentityCheck(input: {
  batteryId: AuditBatteryId | null;
  questionnaire: OdIdentityQuestionnaire | null;
  stepIndex: number;
  shownStepIndexes: ReadonlyArray<number>;
  joinPreviousStep: boolean;
  sessionId: string | null;
}): boolean {
  if (!isOdReserveIdentityBattery(input.batteryId)) {
    return false;
  }
  if (input.joinPreviousStep) {
    return false;
  }
  if (!isOdIdentityQuestionnaireComplete(input.questionnaire)) {
    return false;
  }
  if (input.shownStepIndexes.includes(input.stepIndex)) {
    return false;
  }
  return input.sessionId !== null;
}
