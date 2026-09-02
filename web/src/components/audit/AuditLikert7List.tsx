"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AuditLikert7OptionId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type AuditLikert7Option = {
  /** Балльное значение варианта 1..7. Сохраняется в стор как число. */
  id: AuditLikert7OptionId;
  /** Подпись варианта, отображаемая пользователю. */
  label: string;
};

export type AuditLikert7Question = {
  /** Номер вопроса 1-based. */
  index: number;
  /** Текст утверждения. */
  text: string;
};

export type AuditLikert7ListProps = {
  questions: ReadonlyArray<AuditLikert7Question>;
  /** Общий набор подписей шкалы — одинаков для всех утверждений списка. */
  options: ReadonlyArray<AuditLikert7Option>;
  /** Текущие ответы: `{ q1: 1..7 | null, ... }`. */
  answers: Readonly<Record<string, AuditLikert7OptionId | null>>;
  /** Запись ответа в стор шага. */
  onAnswer: (questionId: string, value: AuditLikert7OptionId) => void;
};

/**
 * Список утверждений с одной 7-балльной шкалой согласия под каждым.
 * Используется шагом 9 (толерантность к неопределённости). 7 кнопок —
 * довольно широкая раскладка, на узких экранах они переносятся по
 * нескольку в ряд (`flex-wrap`).
 */
export function AuditLikert7List({
  questions,
  options,
  answers,
  onAnswer,
}: AuditLikert7ListProps): React.ReactElement {
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
    "flex-1 min-w-[120px] rounded-2xl px-2 py-3 text-center text-[12px] sm:text-[13px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
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
