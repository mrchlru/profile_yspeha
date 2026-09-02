"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { StepLayout } from "@/components/StepLayout";
import { TestMotivation } from "@/components/TestMotivation";
import {
  AuditGerchikovList,
  type AuditGerchikovAnswers,
} from "@/components/audit/AuditGerchikovList";
import { AUDIT_INTROS } from "@/lib/audit/auditIntros";
import {
  AUDIT_STEP_21_QUESTIONS,
  countAuditStep21Answered,
} from "@/lib/audit/questions/step21Gerchikov";
import { useScreeningStepLog } from "@/lib/logging/useScreeningStepLog";
import {
  questionCardSurfaceClass,
  stepNavPrimaryButtonClass,
  stepPageContentClass,
  stepSecondaryTextClass,
} from "@/lib/stepPageTheme";
import { TOTAL_QUESTIONS_COUNT, getAllAnsweredCount, isProfileReady } from "@/lib/progress";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import { queueScreeningStepSync } from "@/lib/screening/syncScreeningStepClient";
import { isGerchikovStep2Complete } from "@/lib/gerchikov/validation";
import { isStep1Complete } from "@/lib/validation/stepCompletion";
import { getContinueButtonLabel } from "@/lib/testMotivation";
import { useFormStore } from "@/store/useFormStore";
import { useScreeningAccessReady } from "@/hooks/useAccessGate";

/**
 * Шаг 2 скрининга: тест Герчикова (16 пунктов) — идентичен аудиту состояния.
 */
export default function Step2Page(): React.ReactElement {
  const router = useRouter();
  const accessReady = useScreeningAccessReady();
  const profileName = useFormStore((s) => s.profileName);
  const personalDataConsent = useFormStore((s) => s.personalDataConsent);
  const consentRecordedAt = useFormStore((s) => s.consentRecordedAt);
  const sessionId = useFormStore((s) => s.sessionId);
  useScreeningStepLog("step-2", sessionId);
  const step1Data = useFormStore((s) => s.step1Data);
  const step2Data = useFormStore((s) => s.step2Data);
  const step3Data = useFormStore((s) => s.step3Data);
  const step4Data = useFormStore((s) => s.step4Data);
  const patchStep2Answer = useFormStore((s) => s.patchStep2Answer);

  const intro = AUDIT_INTROS.intro_gerchikov_17;

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
    if (!isStep1Complete(step1Data)) {
      router.replace("/step-1");
    }
  }, [
    accessReady,
    consentRecordedAt,
    personalDataConsent,
    profileName,
    router,
    sessionId,
    step1Data,
  ]);

  useEffect(() => {
    setScreeningMaxStepCookie(2);
  }, []);

  const visibleAnswers = useMemo((): AuditGerchikovAnswers => {
    const out: Record<string, string | ReadonlyArray<string> | null> = {};
    for (const question of AUDIT_STEP_21_QUESTIONS) {
      const raw = step2Data[question.id];
      if (typeof raw === "string") {
        out[question.id] = raw;
      } else if (Array.isArray(raw)) {
        out[question.id] = raw;
      } else {
        out[question.id] = null;
      }
    }
    return out;
  }, [step2Data]);

  const handleAnswer = useCallback(
    (questionId: string, value: string | ReadonlyArray<string>) => {
      patchStep2Answer(questionId, value);
    },
    [patchStep2Answer]
  );

  const gerchikovAnswered = countAuditStep21Answered(AUDIT_STEP_21_QUESTIONS, step2Data);
  const complete = isGerchikovStep2Complete(step2Data);
  const answeredCount = getAllAnsweredCount(step1Data, step2Data, step3Data, step4Data);
  const continueLabel = getContinueButtonLabel(answeredCount);

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

        <section className={`${questionCardSurfaceClass} mb-4 p-6 sm:px-8 sm:py-6`}>
          <h2 className="mb-3 text-[15px] font-semibold text-[#1B1B1B]">{intro.heading}</h2>
          <div className={`space-y-2 ${stepSecondaryTextClass}`}>
            {intro.paragraphs.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-[#7F7F7F]">
            Отвечено пунктов: {String(gerchikovAnswered)} из {String(AUDIT_STEP_21_QUESTIONS.length)}
          </p>
        </section>

        <AuditGerchikovList
          questions={AUDIT_STEP_21_QUESTIONS}
          answers={visibleAnswers}
          onAnswer={handleAnswer}
        />

        <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
          <Button
            disabled={!complete}
            onClick={() => {
              setScreeningMaxStepCookie(3);
              queueScreeningStepSync(2);
              router.push("/step-3");
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
