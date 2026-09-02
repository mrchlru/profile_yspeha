"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useTuBatteryProfSbMode } from "@/hooks/useTuBatteryProfSbMode";
import { useAuditFormStoreHydrated } from "@/hooks/useAuditAccessGate";
import { useFormStore } from "@/store/useFormStore";
import { useAuditFormStore } from "@/store/useAuditFormStore";

/**
 * Доступ к `/step-4`: блок ПРОФ СБ в батарее ТУ / упров / шефов или скрининга кандидата.
 */
export function useStep4PageAccessReady(): boolean {
  const formHydrated = useFormStoreHydrated();
  const auditHydrated = useAuditFormStoreHydrated();
  const batteryProfSbMode = useTuBatteryProfSbMode();
  const storesHydrated = formHydrated && (batteryProfSbMode ? auditHydrated : true);
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);
  const auditAccessCode = useAuditFormStore((s) => s.accessCodeSnapshot);
  const hasBatteryProfSbAccess =
    batteryProfSbMode &&
    (!!accessCode || (auditAccessCode !== null && auditAccessCode.trim().length >= 8));
  const hasLegacyScreeningRedirect =
    !!accessCode && testKind === TEST_KIND_SCREENING && !batteryProfSbMode;
  const hasAccess = hasBatteryProfSbAccess;

  useEffect(() => {
    if (!storesHydrated) {
      return;
    }
    if (hasLegacyScreeningRedirect) {
      router.replace("/audit/intro");
      return;
    }
    if (!hasAccess) {
      router.replace("/");
    }
  }, [hasAccess, hasLegacyScreeningRedirect, router, storesHydrated]);

  return storesHydrated && hasAccess;
}
