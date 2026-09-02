"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";

import { BurnoutQuestionsLayout } from "@/components/burnout/BurnoutQuestionsLayout";
import { MaslachBurnoutLikertList } from "@/components/burnout/MaslachBurnoutLikertList";
import { StepLayout } from "@/components/StepLayout";
import { useBurnoutAccessReady } from "@/hooks/useBurnoutAccessGate";
import {
  coerceMaslachBurnoutAnswer,
  MASLACH_BURNOUT_OPTIONS,
  MASLACH_BURNOUT_QUESTIONS,
  MASLACH_BURNOUT_QUESTION_COUNT,
  type MaslachBurnoutOptionId,
} from "@/lib/burnout/maslachBurnoutQuestions";
import { getBurnoutAnsweredCount, useBurnoutFormStore } from "@/store/useBurnoutFormStore";

/**
 * Экран с 22 вопросами опросника Маслач.
 */
export default function BurnoutTestPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useBurnoutAccessReady();
  const answers = useBurnoutFormStore((s) => s.answers);
  const setBurnoutAnswer = useBurnoutFormStore((s) => s.setBurnoutAnswer);
  const sessionId = useBurnoutFormStore((s) => s.sessionId);

  const handleAnswer = useCallback(
    (questionId: string, value: MaslachBurnoutOptionId) => {
      setBurnoutAnswer(questionId, value);
    },
    [setBurnoutAnswer]
  );

  const visibleAnswers: Record<string, MaslachBurnoutOptionId | null> = {};
  for (const question of MASLACH_BURNOUT_QUESTIONS) {
    const key = `q${String(question.index)}`;
    visibleAnswers[key] = coerceMaslachBurnoutAnswer(answers[key]);
  }

  const answered = getBurnoutAnsweredCount(answers);
  const canComplete = answered >= MASLACH_BURNOUT_QUESTION_COUNT;

  function handleComplete(): void {
    if (!canComplete) {
      return;
    }
    router.push("/burnout/finish");
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

  if (!sessionId) {
    router.replace("/burnout/intro");
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Перенаправление…
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout>
      <BurnoutQuestionsLayout
        answered={answered}
        total={MASLACH_BURNOUT_QUESTION_COUNT}
        canComplete={canComplete}
        onComplete={handleComplete}
      >
        <MaslachBurnoutLikertList
          questions={MASLACH_BURNOUT_QUESTIONS}
          options={MASLACH_BURNOUT_OPTIONS}
          answers={visibleAnswers}
          onAnswer={handleAnswer}
        />
      </BurnoutQuestionsLayout>
    </StepLayout>
  );
}
