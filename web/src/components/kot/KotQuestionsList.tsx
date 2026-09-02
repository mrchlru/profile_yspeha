"use client";

import React, { memo } from "react";
import { KotQuestionItem } from "@/components/kot/KotQuestionItem";
import { useKotBlockAnswersFromTimer } from "@/components/kot/KotTimeGate";
import { KOT_OFFICIAL_QUESTIONS_ORDERED } from "@/lib/kot/kotOfficial50Questions";
import { useFormStore } from "@/store/useFormStore";

/**
 * Список заданий КОТ: узкая подписка на step1Data + blockAnswers из таймера.
 * memo — при тике таймера родитель может перерисовываться, пока blockAnswers не меняется.
 */
function KotQuestionsListInner(): React.ReactElement {
  const step1Data = useFormStore((s) => s.step1Data);
  const blockAnswers = useKotBlockAnswersFromTimer();

  return (
    <div className="space-y-4">
      {KOT_OFFICIAL_QUESTIONS_ORDERED.map((spec, index) => (
        <KotQuestionItem
          key={spec.key}
          spec={spec}
          displayNum={index + 1}
          value={step1Data[spec.key]}
          blockAnswers={blockAnswers}
        />
      ))}
    </div>
  );
}

export const KotQuestionsList = memo(KotQuestionsListInner);
