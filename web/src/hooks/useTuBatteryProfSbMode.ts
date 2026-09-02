"use client";

import { TEST_KIND_AUDIT_SENIOR, TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { isBatteryWithProfSbId } from "@/lib/audit/isBatteryWithProfSb";
import { useFormStore } from "@/store/useFormStore";
import { useAuditFormStore } from "@/store/useAuditFormStore";

/** Активен ли блок ПРОФ СБ в батарее ТУ / упров / шефов или скрининга кандидата. */
export function useTuBatteryProfSbMode(): boolean {
  const testKind = useFormStore((s) => s.activeTestKind);
  const batteryId = useAuditFormStore((s) => s.batteryId);
  if (!isBatteryWithProfSbId(batteryId)) {
    return false;
  }
  if (batteryId === "tu_management_chef" && testKind === TEST_KIND_AUDIT_SENIOR) {
    return true;
  }
  if (batteryId === "candidate_screening" && testKind === TEST_KIND_SCREENING) {
    return true;
  }
  return false;
}
