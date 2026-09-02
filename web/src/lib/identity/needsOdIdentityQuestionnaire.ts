import type { TestKind } from "@/lib/access/testKinds";
import { isOdIdentityQuestionnaireComplete } from "@/lib/identity/odIdentityCheck";
import { isOdReserveIdentityBattery } from "@/lib/identity/isOdReserveIdentityBattery";
import type { AuditBatteryId } from "@/lib/audit/auditBatteries";
import type { OdIdentityQuestionnaire } from "@/lib/identity/odIdentityTypes";

/**
 * Нужно ли пройти анкету идентичности перед тестами.
 */
export function needsOdIdentityQuestionnaire(input: {
  batteryId: AuditBatteryId | null;
  testKind: TestKind | null;
  isReturningSession: boolean;
  questionnaire: OdIdentityQuestionnaire | null;
}): boolean {
  if (input.isReturningSession) {
    return false;
  }
  if (!isOdReserveIdentityBattery(input.batteryId, input.testKind)) {
    return false;
  }
  return !isOdIdentityQuestionnaireComplete(input.questionnaire);
}
