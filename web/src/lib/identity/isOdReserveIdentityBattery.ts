import { TEST_KIND_AUDIT_MIDDLE, type TestKind } from "@/lib/access/testKinds";
import type { AuditBatteryId } from "@/lib/audit/auditBatteries";

/**
 * Нужна ли анкета и проверки личности для текущей батареи.
 */
export function isOdReserveIdentityBattery(
  batteryId: AuditBatteryId | null | undefined,
  testKind?: TestKind | null
): boolean {
  if (batteryId === "od_reserve") {
    return true;
  }
  return testKind === TEST_KIND_AUDIT_MIDDLE;
}
