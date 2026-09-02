"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AuditLikert4Option = {
  /** Идентификатор варианта (например, "a" | "b" | "v" | "g"). Сохраняется в стор. */
  id: string;
  /** Подпись варианта, отображается пользователю. */
  label: string;
};

export type AuditLikert4Question = {
  /** Номер вопроса 1-based. */
  index: number;
  /** Текст утверждения. */
  text: string;
};

export type AuditLikert4ListProps = {
  questions: ReadonlyArray<AuditLikert4Question>;
  /** Общий набор подписей шкалы — одинаков для всех утверждений списка. */
  options: ReadonlyArray<AuditLikert4Option>;
  /** Текущие ответы: `{ q1: "a" | "b" | … | null, ... }`. */
  answers: Readonly<Record<string, string | null>>;
  /** Запись ответа в стор шага. */
  onAnswer: (questionId: string, value: string) => void;
};

/**
 * Список утверждений с одной 4-балльной шкалой ответа на все позиции.
 * Используется шагом 3 (стиль работы с документами) и другими будущими
 * шагами, где Fisom lab показывает один и тот же набор из четырёх подписей
 * под каждым утверждением.
 *
 * На широких экранах варианты выкладываются в строку, на узких — переходят
 * в столбец (`flex-wrap`). Текст подписей короткий, поэтому компактная
 * горизонтальная раскладка читается лучше, чем вертикальная.
 */
export function AuditLikert4List({
  questions,
  options,
  answers,
  onAnswer,
}: AuditLikert4ListProps): React.ReactElement {
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
                  key={option.id}
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
    "flex-1 min-w-[160px] rounded-2xl px-4 py-3 text-center text-[14px] sm:text-[15px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
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
