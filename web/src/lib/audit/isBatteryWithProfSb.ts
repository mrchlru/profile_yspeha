import type { AuditBatteryId } from "@/lib/audit/auditBatteries";

/** Батареи с блоком анкеты ПРОФ СБ (step-4) в начале маршрута. */
export function isBatteryWithProfSbId(batteryId: AuditBatteryId | null | undefined): boolean {
  return batteryId === "tu_management_chef" || batteryId === "candidate_screening";
}

/** Активна ли батарея скрининга кандидата. */
export function isCandidateScreeningBatteryId(
  batteryId: AuditBatteryId | null | undefined
): boolean {
  return batteryId === "candidate_screening";
}
