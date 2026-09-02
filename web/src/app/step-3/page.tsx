"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { QuestionCard } from "@/components/QuestionCard";
import { StepLayout } from "@/components/StepLayout";
import { TestMotivation } from "@/components/TestMotivation";
import { useScreeningStepLog } from "@/lib/logging/useScreeningStepLog";
import {
  stepNavPrimaryButtonClass,
  stepPageContentClass,
} from "@/lib/stepPageTheme";
import { isGerchikovStep2Complete } from "@/lib/gerchikov/validation";
import { TOTAL_QUESTIONS_COUNT, getAllAnsweredCount, isProfileReady } from "@/lib/progress";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import { queueScreeningStepSync } from "@/lib/screening/syncScreeningStepClient";
import { getContinueButtonLabel } from "@/lib/testMotivation";
import { LikertAnswer, Step3Data, useFormStore } from "@/store/useFormStore";
import { useScreeningAccessReady } from "@/hooks/useAccessGate";

type Step3Question = {
  id: keyof Step3Data;
  title: string;
};

type LikertOption = {
  value: LikertAnswer;
  label: string;
};

function isStep3Complete(data: Step3Data): boolean {
  return Boolean(
    data.q1 &&
      data.q2 &&
      data.q3 &&
      data.q4 &&
      data.q5 &&
      data.q6 &&
      data.q7 &&
      data.q8 &&
      data.q9 &&
      data.q10
  );
}

export default function Step3Page(): React.ReactElement {
  const router = useRouter();
  const accessReady = useScreeningAccessReady();
  const profileName = useFormStore((s) => s.profileName);
  const personalDataConsent = useFormStore((s) => s.personalDataConsent);
  const consentRecordedAt = useFormStore((s) => s.consentRecordedAt);
  const sessionId = useFormStore((s) => s.sessionId);
  useScreeningStepLog("step-3", sessionId);
  const step1Data = useFormStore((s) => s.step1Data);
  const step2Data = useFormStore((s) => s.step2Data);
  const step3Data = useFormStore((s) => s.step3Data);
  const step4Data = useFormStore((s) => s.step4Data);
  const setStep3Data = useFormStore((s) => s.setStep3Data);

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (!isProfileReady(profileName, personalDataConsent, consentRecordedAt)) {
      router.replace("/intro");
      return;
    }
    if (!sessionId) {
      router.replace("/briefing");
      return;
    }
    if (!isGerchikovStep2Complete(step2Data)) {
      router.replace("/step-2");
    }
  }, [
    accessReady,
    consentRecordedAt,
    personalDataConsent,
    profileName,
    router,
    sessionId,
    step2Data,
  ]);

  useEffect(() => {
    setScreeningMaxStepCookie(3);
  }, []);

  const complete = isStep3Complete(step3Data);
  const answeredCount = getAllAnsweredCount(step1Data, step2Data, step3Data, step4Data);
  const continueLabel = getContinueButtonLabel(answeredCount);

  const likertOptions: LikertOption[] = [
    { value: "fully_agree", label: "Полностью согласен" },
    { value: "agree", label: "Согласен" },
    { value: "neutral", label: "Скорее нейтрально" },
    { value: "disagree", label: "Скорее не согласен" },
    { value: "fully_disagree", label: "Полностью не согласен" },
  ];

  const questions: Step3Question[] = [
    { id: "q1", title: "Я обычно сохраняю позитивный настрой на работе." },
    { id: "q2", title: "Мне легко адаптироваться к изменениям." },
    { id: "q3", title: "Я спокойно отношусь к критике и улучшениям." },
    { id: "q4", title: "Я способен(на) поддерживать фокус на задачах." },
    { id: "q5", title: "Я умею восстанавливаться после стресса." },
    { id: "q6", title: "Я проявляю эмпатию к людям вокруг." },
    { id: "q7", title: "Я стремлюсь к ясности и понимаю приоритеты." },
    { id: "q8", title: "Я чувствую контроль над тем, что происходит." },
    { id: "q9", title: "Мне комфортно работать в команде." },
    { id: "q10", title: "Я избегаю конфликтов и умею их разруливать." },
  ];

  function setField(field: Step3Question["id"], value: LikertAnswer): void {
    setStep3Data({ ...step3Data, [field]: value });
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
      <div className={stepPageContentClass}>
        <div className="mb-2">
          <ProgressBar answeredQuestions={answeredCount} totalQuestions={TOTAL_QUESTIONS_COUNT} />
          <TestMotivation profileName={profileName} answeredCount={answeredCount} />
        </div>

        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionCard key={q.id} title={q.title}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {likertOptions.map((opt) => {
                  const inputId = `step3-${q.id}-${opt.value}`;
                  const checked = step3Data[q.id] === opt.value;
                  return (
                    <label
                      key={opt.value}
                      htmlFor={inputId}
                      className="flex items-center gap-3"
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={q.id}
                        checked={checked}
                        onChange={() => setField(q.id, opt.value)}
                        className="mt-0"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </QuestionCard>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
          <Button
            disabled={!complete}
            onClick={() => {
              setScreeningMaxStepCookie(4);
              queueScreeningStepSync(3);
              router.push("/step-4");
            }}
            className={stepNavPrimaryButtonClass}
          >
            {continueLabel}
          </Button>
        </div>
      </div>
    </StepLayout>
  );
}
