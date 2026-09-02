"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { ProctorIntroGate } from "@/components/proctor/ProctorIntroGate";
import { StepLayout } from "@/components/StepLayout";
import { useBurnoutAccessReady } from "@/hooks/useBurnoutAccessGate";
import { useProctorIntroReady, useProctorIntroRequired } from "@/hooks/useProctorIntro";
import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";
import { useBurnoutFormStore } from "@/store/useBurnoutFormStore";

/**
 * Клиентская часть стартового экрана теста на выгорание.
 */
export function BurnoutIntroPageClient(): React.ReactElement {
  const router = useRouter();
  const accessReady = useBurnoutAccessReady();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);
  const beginBurnoutSession = useBurnoutFormStore((s) => s.beginBurnoutSession);
  const leaveBurnoutSession = useBurnoutFormStore((s) => s.leaveBurnoutSession);
  const setAccessCodeSnapshot = useBurnoutFormStore((s) => s.setAccessCodeSnapshot);
  const setPersonalDataConsent = useBurnoutFormStore((s) => s.setPersonalDataConsent);
  const setBurnoutAssesseeName = useBurnoutFormStore((s) => s.setBurnoutAssesseeName);
  const storedFirstName = useBurnoutFormStore((s) => s.firstName);
  const storedLastName = useBurnoutFormStore((s) => s.lastName);
  const sessionId = useBurnoutFormStore((s) => s.sessionId);
  const [firstNameInput, setFirstNameInput] = useState(storedFirstName);
  const [lastNameInput, setLastNameInput] = useState(storedLastName);
  const [consent, setConsent] = useState(false);
  const proctorRequired = useProctorIntroRequired();
  const proctorReady = useProctorIntroReady();

  useEffect(() => {
    setFirstNameInput(storedFirstName);
    setLastNameInput(storedLastName);
  }, [storedFirstName, storedLastName]);

  useEffect(() => {
    if (!accessReady || !validatedAccessCode) {
      return;
    }
    setAccessCodeSnapshot(validatedAccessCode);
  }, [accessReady, setAccessCodeSnapshot, validatedAccessCode]);

  useEffect(() => {
    if (!accessReady || !validatedAccessCode) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: validatedAccessCode }),
      });
      if (cancelled || res.ok) {
        return;
      }
      leaveBurnoutSession();
      clearValidatedAccess();
      router.replace("/");
    })();
    return () => {
      cancelled = true;
    };
  }, [accessReady, validatedAccessCode, clearValidatedAccess, leaveBurnoutSession, router]);

  if (!accessReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  const isReturning = sessionId !== null;
  const assesseeKey = isReturning
    ? null
    : buildAuditAssesseeKey({
        firstName: firstNameInput.trim(),
        lastName: lastNameInput.trim(),
      });
  const canStart = isReturning || (assesseeKey !== null && consent);
  const startDisabled = !canStart || !proctorReady;

  function handleStart(): void {
    if (!canStart) {
      return;
    }
    if (!isReturning && assesseeKey) {
      setBurnoutAssesseeName(assesseeKey.firstNameDisplay, assesseeKey.lastNameDisplay);
      setPersonalDataConsent(true);
    }
    beginBurnoutSession();
    router.push("/burnout/test");
  }

  return (
    <StepLayout>
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[860px] space-y-6 px-8 py-8 ${stepSurfaceCardClass}`}>
          <p className={stepSecondaryTextClass}>
            Опросник из 22 утверждений. На каждое выберите, как часто вы испытываете описанное
            состояние. Займёт около 10–15 минут.
          </p>

          {!isReturning ? (
            <>
              <div>
                <label htmlFor="burnout-last-name" className={`block ${stepLabelClass}`}>
                  Фамилия
                </label>
                <input
                  id="burnout-last-name"
                  value={lastNameInput}
                  onChange={(event) => setLastNameInput(event.target.value)}
                  className={`${stepInputClass} h-12`}
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label htmlFor="burnout-first-name" className={`block ${stepLabelClass}`}>
                  Имя
                </label>
                <input
                  id="burnout-first-name"
                  value={firstNameInput}
                  onChange={(event) => setFirstNameInput(event.target.value)}
                  className={`${stepInputClass} h-12`}
                  autoComplete="given-name"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span className={stepSecondaryTextClass}>
                  Я согласен(на) на обработку персональных данных в рамках прохождения теста.
                </span>
              </label>
            </>
          ) : (
            <p className={stepSecondaryTextClass}>
              У вас есть незавершённое прохождение. Можно продолжить с того места, где остановились.
            </p>
          )}

          {proctorRequired ? <ProctorIntroGate /> : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={startDisabled}
              onClick={handleStart}
              className={stepNavPrimaryButtonClass}
            >
              {isReturning ? "Продолжить тест" : "Начать тест"}
            </Button>
          </div>
          {proctorRequired && !proctorReady && canStart ? (
            <p className="text-[14px] font-medium text-amber-900" role="status">
              Сначала разрешите камеру и микрофон — кнопка «{isReturning ? "Продолжить тест" : "Начать тест"}» станет активной.
            </p>
          ) : null}
        </div>
      </div>
    </StepLayout>
  );
}
