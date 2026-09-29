"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { ProctorIntroGate } from "@/components/proctor/ProctorIntroGate";
import { StepLayout } from "@/components/StepLayout";
import { useSpecialistScreeningAccessReady } from "@/hooks/useSpecialistScreeningAccessGate";
import { useProctorIntroReady, useProctorIntroRequired } from "@/hooks/useProctorIntro";
import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { requestProctorFullscreen } from "@/lib/proctor/requestProctorFullscreen";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";
import { useSpecialistScreeningFormStore } from "@/store/useSpecialistScreeningFormStore";

/**
 * Стартовый экран конфиденциального скрининга направления к специалисту.
 */
export function SpecialistScreeningIntroPageClient(): React.ReactElement {
  const router = useRouter();
  const accessReady = useSpecialistScreeningAccessReady();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);
  const beginSession = useSpecialistScreeningFormStore((s) => s.beginSpecialistScreeningSession);
  const leaveSession = useSpecialistScreeningFormStore((s) => s.leaveSpecialistScreeningSession);
  const setAccessCodeSnapshot = useSpecialistScreeningFormStore((s) => s.setAccessCodeSnapshot);
  const setPersonalDataConsent = useSpecialistScreeningFormStore((s) => s.setPersonalDataConsent);
  const setAssesseeName = useSpecialistScreeningFormStore(
    (s) => s.setSpecialistScreeningAssesseeName
  );
  const storedFirstName = useSpecialistScreeningFormStore((s) => s.firstName);
  const storedLastName = useSpecialistScreeningFormStore((s) => s.lastName);
  const sessionId = useSpecialistScreeningFormStore((s) => s.sessionId);
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
      leaveSession();
      clearValidatedAccess();
      router.replace("/");
    })();
    return () => {
      cancelled = true;
    };
  }, [accessReady, validatedAccessCode, clearValidatedAccess, leaveSession, router]);

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
      setAssesseeName(assesseeKey.firstNameDisplay, assesseeKey.lastNameDisplay);
      setPersonalDataConsent(true);
    }
    beginSession();
    void requestProctorFullscreen();
    router.push("/specialist-screening/test");
  }

  return (
    <StepLayout>
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[860px] space-y-6 px-8 py-8 ${stepSurfaceCardClass}`}>
          <p className={stepSecondaryTextClass}>
            Опросник из 22 вопросов. На каждый выберите подходящий вариант ответа. Займёт около
            10–15 минут.
          </p>

          {!isReturning ? (
            <>
              <div>
                <label htmlFor="specialist-screening-last-name" className={`block ${stepLabelClass}`}>
                  Фамилия
                </label>
                <input
                  id="specialist-screening-last-name"
                  value={lastNameInput}
                  onChange={(event) => setLastNameInput(event.target.value)}
                  className={`${stepInputClass} h-12`}
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label
                  htmlFor="specialist-screening-first-name"
                  className={`block ${stepLabelClass}`}
                >
                  Имя
                </label>
                <input
                  id="specialist-screening-first-name"
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
              Сначала разрешите камеру и микрофон — кнопка «
              {isReturning ? "Продолжить тест" : "Начать тест"}» станет активной.
            </p>
          ) : null}
        </div>
      </div>
    </StepLayout>
  );
}
