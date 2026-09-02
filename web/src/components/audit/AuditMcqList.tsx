"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AuditMcqOption = {
  /** Идентификатор варианта (например, "a" | "b" | "v"). Сохраняется в стор как значение ответа. */
  id: string;
  /** Подпись варианта, отображается пользователю. */
  label: string;
};

export type AuditMcqQuestion = {
  /** Номер вопроса 1-based. */
  index: number;
  /** Текст вопроса. */
  text: string;
  /** Список вариантов в нужном порядке. */
  options: ReadonlyArray<AuditMcqOption>;
};

export type AuditMcqListProps = {
  questions: ReadonlyArray<AuditMcqQuestion>;
  /** Текущие ответы: `{ q1: "a" | "b" | … | null, ... }`. */
  answers: Readonly<Record<string, string | null>>;
  /** Запись ответа в стор шага. */
  onAnswer: (questionId: string, value: string) => void;
};

/**
 * Список вопросов с одним выбором из произвольного числа вариантов.
 * Используется для шагов аудита, где Fisom lab показывает классический
 * выбор из а/б/в (или а/б/в/г и т. п.), а варианты — это отдельные
 * текстовые подписи без числовой шкалы. Карточки сделаны в общем стиле
 * приложения, как в `AuditYesNoList`.
 */
export function AuditMcqList({
  questions,
  answers,
  onAnswer,
}: AuditMcqListProps): React.ReactElement {
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
            <div className="flex flex-col gap-2">
              {question.options.map((option) => (
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
    "w-full rounded-2xl px-4 py-3 text-left text-[15px] sm:text-[16px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
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
