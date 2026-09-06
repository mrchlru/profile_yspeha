"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { StepLayout } from "@/components/StepLayout";
import { useProfSbEducationAccessReady } from "@/hooks/useProfSbEducationAccessGate";
import { ensureBatteryProfSbRouteCookie } from "@/lib/ensureBatteryProfSbRouteCookie";
import { BATTERY_PROF_SB_ROUTE } from "@/lib/audit/batteryStepMarkers";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import { useProfSbEducationFormStore } from "@/store/useProfSbEducationFormStore";
import { useFormStore } from "@/store/useFormStore";
import { prefillStep4PersonalFromAuditNames } from "@/lib/step4/prefillStep4FromAudit";

/**
 * Переход на ту же анкету step-4, что в скрининге (ПРОФ СБ + ПРОФ образование).
 */
export function ProfSbEducationPlaceholderTest(): ReactElement {
  const router = useRouter();
  const accessReady = useProfSbEducationAccessReady();
  const firstName = useProfSbEducationFormStore((s) => s.firstName);
  const lastName = useProfSbEducationFormStore((s) => s.lastName);
  const beginProfSbEducationSession = useProfSbEducationFormStore(
    (s) => s.beginProfSbEducationSession
  );
  const step4Data = useFormStore((s) => s.step4Data);
  const setStep4Data = useFormStore((s) => s.setStep4Data);

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    beginProfSbEducationSession();
    const prefilled = prefillStep4PersonalFromAuditNames(step4Data, firstName, lastName);
    if (prefilled !== step4Data) {
      setStep4Data(prefilled);
    }
    setScreeningMaxStepCookie(4);
    ensureBatteryProfSbRouteCookie(BATTERY_PROF_SB_ROUTE);
    router.replace(BATTERY_PROF_SB_ROUTE);
  }, [
    accessReady,
    beginProfSbEducationSession,
    firstName,
    lastName,
    router,
    setStep4Data,
    step4Data,
  ]);

  return (
    <StepLayout>
      <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
        Открываем анкету…
      </div>
    </StepLayout>
  );
}
