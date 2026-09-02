"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AuditYesNoUnknownQuestion = {
  /** Номер вопроса (1-based). Используется как часть ключа ответа `q<index>`. */
  index: number;
  /** Текст утверждения, отображается «один в один». */
  text: string;
};

export type AuditYesNoUnknownAnswer = "yes" | "no" | "unknown" | null;

export type AuditYesNoUnknownListProps = {
  questions: ReadonlyArray<AuditYesNoUnknownQuestion>;
  /** Текущие ответы: `{ q1: "yes" | "no" | "unknown" | null, ... }`. */
  answers: Readonly<Record<string, AuditYesNoUnknownAnswer>>;
  /** Запись одного ответа в стор шага. */
  onAnswer: (questionId: string, value: AuditYesNoUnknownAnswer) => void;
};

/**
 * Карточный список вопросов с тройным ответом «Да / Нет / Не знаю».
 * Используется шагом 6 (оценка типа стрессоустойчивости) и любыми будущими
 * шагами, где Fisom lab показывает три варианта без числовой шкалы.
 *
 * В инструкции исходной методики просят «не злоупотреблять ответом „не знаю“»,
 * это сообщение мы транслируем через текст инструкции в `auditIntros.ts`,
 * а не здесь — в самом списке только сами кнопки.
 */
export function AuditYesNoUnknownList({
  questions,
  answers,
  onAnswer,
}: AuditYesNoUnknownListProps): React.ReactElement {
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
            <div className="flex flex-wrap gap-3">
              <Choice
                isActive={current === "yes"}
                label="Да"
                onClick={() => onAnswer(questionId, "yes")}
              />
              <Choice
                isActive={current === "no"}
                label="Нет"
                onClick={() => onAnswer(questionId, "no")}
              />
              <Choice
                isActive={current === "unknown"}
                label="Не знаю"
                onClick={() => onAnswer(questionId, "unknown")}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Choice({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  const base =
    "min-w-[120px] rounded-2xl px-6 py-3 text-[16px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
  const activeCls = "bg-[#00B596] text-white shadow-[0px_4px_18px_0px_rgba(0,181,150,0.35)]";
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
