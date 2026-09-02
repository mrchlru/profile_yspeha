"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AuditLikert11OptionId =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type AuditLikert11Option = {
  /** Балльное значение варианта 1..11. Сохраняется в стор как число. */
  id: AuditLikert11OptionId;
  /** Подпись варианта (число), отображаемая на кнопке. */
  label: string;
  /** Опциональная подсказка под кнопкой (для крайних значений и середины). */
  hint?: string;
};

export type AuditLikert11Question = {
  index: number;
  text: string;
};

export type AuditLikert11ListProps = {
  questions: ReadonlyArray<AuditLikert11Question>;
  options: ReadonlyArray<AuditLikert11Option>;
  answers: Readonly<Record<string, AuditLikert11OptionId | null>>;
  onAnswer: (questionId: string, value: AuditLikert11OptionId) => void;
};

/**
 * Список утверждений с 11-балльной шкалой оценки под каждым. Используется
 * шагом 22 (лояльность к организации). Сама шкала — это 11 узких кнопок-чисел
 * с подписью «1 — максимально негативно / 6 — нейтрально / 11 — максимально
 * позитивно» под каждой карточкой, как ориентир для пользователя.
 *
 * На узких экранах кнопки переносятся в несколько рядов через `flex-wrap`.
 */
export function AuditLikert11List({
  questions,
  options,
  answers,
  onAnswer,
}: AuditLikert11ListProps): React.ReactElement {
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
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {options.map((option) => (
                <OptionChoice
                  key={String(option.id)}
                  isActive={current === option.id}
                  label={option.label}
                  onClick={() => onAnswer(questionId, option.id)}
                />
              ))}
            </div>
            <_ScaleLegend />
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
    "w-full rounded-xl px-2 py-3 text-center text-[14px] sm:text-[15px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
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

function _ScaleLegend(): React.ReactElement {
  return (
    <div className="mt-2 flex justify-between gap-2 text-[11px] uppercase tracking-wide text-[#9B9B9B]">
      <span>1 — макс. негативно</span>
      <span className="hidden sm:inline">6 — нейтрально</span>
      <span>11 — макс. позитивно</span>
    </div>
  );
}
