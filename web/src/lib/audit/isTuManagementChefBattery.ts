import type { AuditBatteryId } from "@/lib/audit/auditBatteries";

/** Активна ли батарея ТУ / упров / шефов (с анкетой ПРОФ СБ). */
export function isTuManagementChefBatteryId(batteryId: AuditBatteryId | null | undefined): boolean {
  return batteryId === "tu_management_chef";
}
