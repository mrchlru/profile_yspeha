"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  isProfSbEducationTestKind,
  TEST_KIND_SCREENING,
} from "@/lib/access/testKinds";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useTuBatteryProfSbMode } from "@/hooks/useTuBatteryProfSbMode";
import { useAuditFormStoreHydrated } from "@/hooks/useAuditAccessGate";
import { useFormStore } from "@/store/useFormStore";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useProfSbEducationFormStore } from "@/store/useProfSbEducationFormStore";

/**
 * Доступ к `/step-4`: батарея ТУ/скрининга или отдельное приглашение ПРОФ СБ + образование.
 */
export function useStep4PageAccessReady(): boolean {
  const formHydrated = useFormStoreHydrated();
  const auditHydrated = useAuditFormStoreHydrated();
  const batteryProfSbMode = useTuBatteryProfSbMode();
  const testKind = useFormStore((s) => s.activeTestKind);
  const standaloneProfMode = isProfSbEducationTestKind(testKind);
  const storesHydrated = formHydrated && (batteryProfSbMode ? auditHydrated : true);
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const auditAccessCode = useAuditFormStore((s) => s.accessCodeSnapshot);
  const profAccessCode = useProfSbEducationFormStore((s) => s.accessCodeSnapshot);
  const hasBatteryProfSbAccess =
    batteryProfSbMode &&
    (!!accessCode || (auditAccessCode !== null && auditAccessCode.trim().length >= 8));
  const hasStandaloneProfAccess =
    standaloneProfMode &&
    (!!accessCode ||
      (profAccessCode !== null && profAccessCode.trim().length >= 8));
  const hasLegacyScreeningRedirect =
    !!accessCode && testKind === TEST_KIND_SCREENING && !batteryProfSbMode;
  const hasAccess = hasBatteryProfSbAccess || hasStandaloneProfAccess;

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
