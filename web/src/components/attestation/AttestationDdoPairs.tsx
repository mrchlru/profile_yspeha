"use client";

import React from "react";

import type { KlimovDdoQuestion } from "@/lib/attestation/attestationQuestions";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AttestationDdoPairsProps = {
  questions: ReadonlyArray<KlimovDdoQuestion>;
  answers: Readonly<Record<string, "a" | "b" | null>>;
  onAnswer: (questionId: string, value: "a" | "b") => void;
};

/**
 * Пары альтернатив (ДДО): выбор варианта A или B.
 */
export function AttestationDdoPairs({
  questions,
  answers,
  onAnswer,
}: AttestationDdoPairsProps): React.ReactElement {
  return (
    <ol className="space-y-3" type="1">
      {questions.map((question, index) => {
        const current = answers[question.id] ?? null;
        return (
          <li
            key={question.id}
            className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}
          >
            <p className={`${stepQuestionTitleClass} mb-3`}>
              <span className="mr-2 text-[#00B596]">{`${String(index + 1)}.`}</span>
              Что вам интереснее?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <PairChoice
                label={question.optionA}
                isActive={current === "a"}
                onClick={() => onAnswer(question.id, "a")}
              />
              <PairChoice
                label={question.optionB}
                isActive={current === "b"}
                onClick={() => onAnswer(question.id, "b")}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type PairChoiceProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

function PairChoice({ label, isActive, onClick }: PairChoiceProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl border px-4 py-3 text-left text-[14px] font-medium transition ${
        isActive
          ? "border-[#00B596] bg-[#00B596]/10 text-[#006B59]"
          : "border-black/10 bg-white/80 text-[#5F5E5E] hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}
