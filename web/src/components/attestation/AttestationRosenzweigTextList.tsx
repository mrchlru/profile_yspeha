"use client";

import React from "react";

import type { RosenzweigSituation } from "@/lib/attestation/attestationQuestions";
import {
  questionCardSurfaceClass,
  stepInputClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AttestationRosenzweigTextListProps = {
  situations: ReadonlyArray<RosenzweigSituation>;
  answers: Readonly<Record<string, string | null>>;
  onAnswer: (questionId: string, value: string) => void;
};

/**
 * Ситуации Розенцвейга: свободный текст ответа.
 */
export function AttestationRosenzweigTextList({
  situations,
  answers,
  onAnswer,
}: AttestationRosenzweigTextListProps): React.ReactElement {
  return (
    <ol className="space-y-3" type="1">
      {situations.map((situation, index) => (
        <li
          key={situation.id}
          className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}
        >
          <p className={`${stepQuestionTitleClass} mb-3`}>
            <span className="mr-2 text-[#00B596]">{`${String(index + 1)}.`}</span>
            {situation.text}
          </p>
          <textarea
            value={answers[situation.id] ?? ""}
            onChange={(event) => onAnswer(situation.id, event.target.value)}
            rows={4}
            className={`${stepInputClass} min-h-[100px] w-full resize-y`}
            placeholder="Опишите ваши действия и слова…"
          />
        </li>
      ))}
    </ol>
  );
}
