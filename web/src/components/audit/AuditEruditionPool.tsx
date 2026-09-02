"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";
import type { AuditStep24Question } from "@/lib/audit/questions/step24Erudition";

export type AuditEruditionPoolProps = {
  /** Полный пул вопросов шага. */
  questions: ReadonlyArray<AuditStep24Question>;
  /** Текущие ответы шага: `qN → optionId | null`. */
  answers: Readonly<Record<string, string | null>>;
  /** Индекс текущего вопроса (0-based). Если совпадает с длиной списка — пул исчерпан. */
  currentIndex: number;
  /** Запись ответа в стор шага. */
  onAnswer: (questionId: string, optionId: string) => void;
};

/**
 * Пул вопросов «по одному за раз» для шага 24 (эрудиция, 18 минут).
 *
 * На экране показывается текущий невыбранный вопрос и список его вариантов.
 * После клика по варианту ответ сохраняется и автоматически появляется
 * следующий вопрос пула. Когда пул исчерпан, выводится сообщение об ожидании
 * автозавершения — фактический переход на следующий шаг управляет таймер
 * (`AuditStepTimerHost`) либо кнопка «Завершить шаг» в общем layout,
 * которая становится активной только после ответа на все 55 вопросов.
 */
export function AuditEruditionPool({
  questions,
  answers,
  currentIndex,
  onAnswer,
}: AuditEruditionPoolProps): React.ReactElement {
  if (currentIndex >= questions.length) {
    return <_AllAnsweredCard total={questions.length} />;
  }
  const question = questions[currentIndex];
  if (question === undefined) {
    return <_AllAnsweredCard total={questions.length} />;
  }
  const questionId = `q${String(question.index)}`;
  const current = answers[questionId] ?? null;
  return (
    <article
      className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}
    >
      <p className={`${stepQuestionTitleClass} mb-3`}>
        <span className="mr-2 text-[#00B596]">{`${String(question.index)}.`}</span>
        {question.text}
      </p>
      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <_OptionChoice
            key={option.id}
            isActive={current === option.id}
            label={option.label}
            onClick={(): void => onAnswer(questionId, option.id)}
          />
        ))}
      </div>
    </article>
  );
}

function _AllAnsweredCard({ total }: { total: number }): React.ReactElement {
  return (
    <article
      className={`${questionCardSurfaceClass} px-5 py-6 sm:px-6 sm:py-8 text-center`}
    >
      <p className={`${stepQuestionTitleClass} mb-2`}>
        Вы ответили на все вопросы пула
      </p>
      <p className="text-[15px] text-[#5F5E5E]">
        {`Всего: ${String(total)}. Дождитесь окончания таймера или нажмите «Завершить шаг»,
        чтобы перейти к финалу.`}
      </p>
    </article>
  );
}

function _OptionChoice({
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
