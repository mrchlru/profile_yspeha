"use client";

import React from "react";
import type {
  MaslachBurnoutOption,
  MaslachBurnoutOptionId,
  MaslachBurnoutQuestion,
} from "@/lib/burnout/maslachBurnoutQuestions";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type MaslachBurnoutLikertListProps = {
  questions: ReadonlyArray<MaslachBurnoutQuestion>;
  options: ReadonlyArray<MaslachBurnoutOption>;
  answers: Readonly<Record<string, MaslachBurnoutOptionId | null>>;
  onAnswer: (questionId: string, value: MaslachBurnoutOptionId) => void;
};

/**
 * Список утверждений Маслач с 7-балльной шкалой частоты под каждым.
 */
export function MaslachBurnoutLikertList({
  questions,
  options,
  answers,
  onAnswer,
}: MaslachBurnoutLikertListProps): React.ReactElement {
  return (
    <ol className="space-y-3" type="1">
      {questions.map((question) => {
        const questionId = `q${String(question.index)}`;
        const current = answers[questionId] ?? null;
        return (
          <li
            key={questionId}
            className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}
          >
            <p className={`${stepQuestionTitleClass} mb-3`}>
              <span className="mr-2 text-[#00B596]">{`${String(question.index)}.`}</span>
              {question.text}
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <OptionChoice
                  key={String(option.id)}
                  isActive={current === option.id}
                  label={option.label}
                  onClick={() => onAnswer(questionId, option.id)}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function OptionChoice({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  const base =
    "flex-1 min-w-[100px] rounded-2xl px-2 py-3 text-center text-[12px] sm:text-[13px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
  const activeCls =
    "bg-[#00B596] text-white shadow-[0px_4px_18px_0px_rgba(0,181,150,0.35)]";
  const inactiveCls =
    "bg-white/85 text-[#5F5E5E] hover:bg-white border border-black/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${isActive ? activeCls : inactiveCls}`}
    >
      {label}
    </button>
  );
}
