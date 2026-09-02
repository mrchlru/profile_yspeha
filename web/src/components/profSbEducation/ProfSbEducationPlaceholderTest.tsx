"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import {
  useProfSbEducationAccessReady,
  useTuBatteryProfSbStepReady,
} from "@/hooks/useProfSbEducationAccessGate";
import { useTuBatteryProfSbMode } from "@/hooks/useTuBatteryProfSbMode";
import { BATTERY_PROF_SB_STEP_MARKER } from "@/lib/audit/batteryStepMarkers";
import { getBatteryNextRouteAfterStep } from "@/lib/audit/batteryNavigation";
import {
  getBatterySequenceStepProgress,
} from "@/lib/audit/auditBatteries";
import { PROF_SB_EDUCATION_SECTIONS } from "@/lib/profSbEducation/profSbEducationTypes";
import {
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";
import { useProfSbEducationFormStore } from "@/store/useProfSbEducationFormStore";

/**
 * Заглушка анкеты до загрузки вопросов и ключей интерпретации.
 */
export function ProfSbEducationPlaceholderTest(): React.ReactElement {
  const router = useRouter();
  const tuBatteryMode = useTuBatteryProfSbMode();
  const accessReady = useProfSbEducationAccessReady();
  const tuStepReady = useTuBatteryProfSbStepReady();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const batteryStepSequence = useAuditFormStore((s) => s.batteryStepSequence);
  const markStepReached = useAuditFormStore((s) => s.markStepReached);
  const markStepCompleted = useAuditFormStore((s) => s.markStepCompleted);
  const setAccessCodeSnapshot = useAuditFormStore((s) => s.setAccessCodeSnapshot);
  const auditFirstName = useAuditFormStore((s) => s.firstName);
  const auditLastName = useAuditFormStore((s) => s.lastName);
  const setProfSbEducationAssesseeName = useProfSbEducationFormStore(
    (s) => s.setProfSbEducationAssesseeName
  );
  const beginProfSbEducationSession = useProfSbEducationFormStore(
    (s) => s.beginProfSbEducationSession
  );

  const ready = accessReady && (!tuBatteryMode || tuStepReady);
  const sections = tuBatteryMode
    ? PROF_SB_EDUCATION_SECTIONS.filter((section) => section.id === "profSb")
    : PROF_SB_EDUCATION_SECTIONS;

  const sequenceProgress =
    batteryStepSequence !== null
      ? getBatterySequenceStepProgress(
          batteryStepSequence,
          BATTERY_PROF_SB_STEP_MARKER
        )
      : null;

  useEffect(() => {
    if (!ready || !tuBatteryMode) {
      return;
    }
    if (validatedAccessCode) {
      setAccessCodeSnapshot(validatedAccessCode);
    }
    if (auditFirstName.trim() && auditLastName.trim()) {
      setProfSbEducationAssesseeName(auditFirstName, auditLastName);
    }
    beginProfSbEducationSession();
    markStepReached(BATTERY_PROF_SB_STEP_MARKER);
  }, [
    auditFirstName,
    auditLastName,
    beginProfSbEducationSession,
    markStepReached,
    ready,
    setAccessCodeSnapshot,
    setProfSbEducationAssesseeName,
    tuBatteryMode,
    validatedAccessCode,
  ]);

  if (!ready) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  function handleComplete(): void {
    if (tuBatteryMode && batteryStepSequence !== null) {
      markStepCompleted(BATTERY_PROF_SB_STEP_MARKER);
      const nextRoute = getBatteryNextRouteAfterStep(
        batteryStepSequence,
        BATTERY_PROF_SB_STEP_MARKER
      );
      if (nextRoute !== null) {
        router.push(nextRoute);
        return;
      }
      router.push("/audit/finish");
      return;
    }
    router.push("/prof-sb-education/finish");
  }

  return (
    <StepLayout>
      <div className="flex flex-1 justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[860px] space-y-6 px-8 py-8 ${stepSurfaceCardClass}`}>
          {tuBatteryMode && sequenceProgress !== null ? (
            <p className="text-[14px] font-semibold text-[#8C8C8C]">
              {`Шаг ${String(sequenceProgress.stepNumber)} из ${String(sequenceProgress.totalSteps)}`}
            </p>
          ) : null}
          <p className={stepSecondaryTextClass}>
            {tuBatteryMode
              ? "Анкета ПРОФ СБ. Вопросы, шкалы и интерпретация будут добавлены после получения вводных."
              : "Структура анкеты подготовлена. Вопросы, шкалы и интерпретация по блокам будут добавлены после получения методики."}
          </p>

          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="rounded-2xl border border-black/10 bg-white/60 px-5 py-4"
              >
                <h2 className="text-[18px] font-extrabold text-[#5F5E5E]">{section.title}</h2>
                <p className={`mt-2 ${stepSecondaryTextClass}`}>{section.description}</p>
                <p className="mt-3 text-[14px] font-medium text-amber-800">
                  Вопросы блока — в разработке
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleComplete}
              className={stepNavPrimaryButtonClass}
            >
              {tuBatteryMode ? "Далее" : "Завершить (заглушка)"}
            </Button>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
