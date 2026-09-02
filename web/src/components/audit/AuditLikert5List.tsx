"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AuditLikert5OptionId = -2 | -1 | 0 | 1 | 2;

export type AuditLikert5Option = {
  /** Балльное значение варианта (-2..+2). Сохраняется в стор как число. */
  id: AuditLikert5OptionId;
  /** Подпись варианта, отображаемая пользователю. */
  label: string;
};

export type AuditLikert5Question = {
  /** Номер вопроса 1-based. */
  index: number;
  /** Текст вопроса. */
  text: string;
};

export type AuditLikert5ListProps = {
  questions: ReadonlyArray<AuditLikert5Question>;
  /** Общий набор подписей шкалы — одинаков для всех вопросов списка. */
  options: ReadonlyArray<AuditLikert5Option>;
  /** Текущие ответы: `{ q1: -2 | -1 | 0 | 1 | 2 | null, ... }`. */
  answers: Readonly<Record<string, AuditLikert5OptionId | null>>;
  /** Запись ответа в стор шага. */
  onAnswer: (questionId: string, value: AuditLikert5OptionId) => void;
};

/**
 * Список вопросов с одной 5-балльной шкалой ответа на все позиции.
 * Используется шагом 5 (готовность к риску). На широких экранах 5 кнопок
 * выкладываются в строку, на узких — переносятся (`flex-wrap`).
 */
export function AuditLikert5List({
  questions,
  options,
  answers,
  onAnswer,
}: AuditLikert5ListProps): React.ReactElement {
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
    "flex-1 min-w-[140px] rounded-2xl px-3 py-3 text-center text-[13px] sm:text-[14px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
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
