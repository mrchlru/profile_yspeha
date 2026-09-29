"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { SpecialistScreeningLikertList } from "@/components/specialistScreening/SpecialistScreeningLikertList";
import { SpecialistScreeningQuestionsLayout } from "@/components/specialistScreening/SpecialistScreeningQuestionsLayout";
import { StepLayout } from "@/components/StepLayout";
import { useSpecialistScreeningAccessReady } from "@/hooks/useSpecialistScreeningAccessGate";
import {
  coerceSpecialistScreeningAnswer,
  listSpecialistScreeningSectionQuestions,
  SPECIALIST_SCREENING_QUESTION_COUNT,
  SPECIALIST_SCREENING_QUESTIONS,
  type SpecialistScreeningOptionId,
  type SpecialistScreeningSectionId,
} from "@/lib/specialistScreening/specialistScreeningQuestions";
import {
  getSpecialistScreeningAnsweredCount,
  useSpecialistScreeningFormStore,
} from "@/store/useSpecialistScreeningFormStore";

const SECTION_ORDER: ReadonlyArray<SpecialistScreeningSectionId> = [
  "phq9",
  "gad7",
  "asrs",
];

/**
 * Экран с вопросами PHQ-9, GAD-7 и ASRS.
 */
export default function SpecialistScreeningTestPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useSpecialistScreeningAccessReady();
  const answers = useSpecialistScreeningFormStore((s) => s.answers);
  const setAnswer = useSpecialistScreeningFormStore((s) => s.setSpecialistScreeningAnswer);
  const sessionId = useSpecialistScreeningFormStore((s) => s.sessionId);

  const handleAnswer = useCallback(
    (questionId: string, value: SpecialistScreeningOptionId) => {
      setAnswer(questionId, value);
    },
    [setAnswer]
  );

  const sections = useMemo(
    () =>
      SECTION_ORDER.map((sectionId) => ({
        sectionId,
        questions: listSpecialistScreeningSectionQuestions(sectionId),
      })),
    []
  );

  const visibleAnswers: Record<string, SpecialistScreeningOptionId | null> = {};
  for (const question of SPECIALIST_SCREENING_QUESTIONS) {
    visibleAnswers[question.id] = coerceSpecialistScreeningAnswer(
      question,
      answers[question.id]
    );
  }

  const answered = getSpecialistScreeningAnsweredCount(answers);
  const canComplete = answered >= SPECIALIST_SCREENING_QUESTION_COUNT;

  function handleComplete(): void {
    if (!canComplete) {
      return;
    }
    router.push("/specialist-screening/finish");
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
    router.replace("/specialist-screening/intro");
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
      <SpecialistScreeningQuestionsLayout
        answered={answered}
        total={SPECIALIST_SCREENING_QUESTION_COUNT}
        canComplete={canComplete}
        onComplete={handleComplete}
      >
        <SpecialistScreeningLikertList
          sections={sections}
          answers={visibleAnswers}
          onAnswer={handleAnswer}
        />
      </SpecialistScreeningQuestionsLayout>
    </StepLayout>
  );
}
