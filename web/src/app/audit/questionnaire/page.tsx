"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { OdIdentityQuestionnaireForm } from "@/components/identity/OdIdentityQuestionnaireForm";
import { StepLayout } from "@/components/StepLayout";
import { useAuditAccessReady } from "@/hooks/useAuditAccessGate";
import { getBatteryEntryRouteFromSequence } from "@/lib/audit/batteryNavigation";
import { isOdIdentityQuestionnaireComplete } from "@/lib/identity/odIdentityCheck";
import { isOdReserveIdentityBattery } from "@/lib/identity/isOdReserveIdentityBattery";
import type { OdIdentityQuestionnaire } from "@/lib/identity/odIdentityTypes";
import {
  stepSectionTitleClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useAuditFormStore } from "@/store/useAuditFormStore";

/**
 * Анкета идентичности для батареи ОД / кадрового резерва (после превью, перед тестами).
 */
export default function AuditQuestionnairePage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useAuditAccessReady();
  const batteryId = useAuditFormStore((s) => s.batteryId);
  const batteryStepSequence = useAuditFormStore((s) => s.batteryStepSequence);
  const questionnaire = useAuditFormStore((s) => s.odIdentityQuestionnaire);
  const personalDataConsent = useAuditFormStore((s) => s.personalDataConsent);
  const firstName = useAuditFormStore((s) => s.firstName);
  const lastName = useAuditFormStore((s) => s.lastName);
  const setOdIdentityQuestionnaire = useAuditFormStore((s) => s.setOdIdentityQuestionnaire);
  const setAuditAssesseeName = useAuditFormStore((s) => s.setAuditAssesseeName);

  const entryRoute =
    batteryStepSequence !== null && batteryStepSequence.length > 0
      ? getBatteryEntryRouteFromSequence(batteryStepSequence)
      : "/audit/intro";

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (!isOdReserveIdentityBattery(batteryId) || !personalDataConsent) {
      router.replace("/audit/intro");
      return;
    }
    if (isOdIdentityQuestionnaireComplete(questionnaire)) {
      router.replace(entryRoute);
    }
  }, [accessReady, batteryId, entryRoute, personalDataConsent, questionnaire, router]);

  function handleSubmit(data: OdIdentityQuestionnaire): void {
    setOdIdentityQuestionnaire(data);
    setAuditAssesseeName(data.firstName, data.lastName);
    router.push(entryRoute);
  }

  if (!accessReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout>
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[860px] px-8 py-8 ${stepSurfaceCardClass}`}>
          <h1 className={stepSectionTitleClass}>Анкета перед тестированием</h1>
          <div className="mt-6">
            <OdIdentityQuestionnaireForm
              initialFirstName={firstName}
              initialLastName={lastName}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
