"use client";

import React from "react";

import type { LikertOption } from "@/lib/attestation/attestationQuestions";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AttestationLikertListProps = {
  questions: ReadonlyArray<{ id: string; text: string }>;
  options: ReadonlyArray<LikertOption>;
  answers: Readonly<Record<string, number | null>>;
  onAnswer: (questionId: string, value: number) => void;
};

/**
 * Список утверждений со шкалой Лайкерта.
 */
export function AttestationLikertList({
  questions,
  options,
  answers,
  onAnswer,
}: AttestationLikertListProps): React.ReactElement {
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
              {question.text}
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <OptionChoice
                  key={String(option.id)}
                  isActive={current === option.id}
                  label={option.label}
                  onClick={() => onAnswer(question.id, option.id)}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type OptionChoiceProps = {
  isActive: boolean;
  label: string;
  onClick: () => void;
};

function OptionChoice({ isActive, label, onClick }: OptionChoiceProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-[13px] font-bold transition sm:px-4 sm:text-[14px] ${
        isActive
          ? "bg-[#00B596] text-white shadow-sm"
          : "bg-white/80 text-[#5F5E5E] hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}
