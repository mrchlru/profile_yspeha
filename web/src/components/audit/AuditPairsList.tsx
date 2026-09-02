"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";

export type AuditPair = {
  /** Номер пары (1-based). Используется как часть ключа ответа `q<index>`. */
  index: number;
  /** Текст утверждения «а». */
  optionA: string;
  /** Текст утверждения «б». */
  optionB: string;
};

export type AuditPairAnswer = "a" | "b" | null;

export type AuditPairsListProps = {
  pairs: ReadonlyArray<AuditPair>;
  /** Текущие ответы: `{ q1: "a" | "b" | null, ... }`. */
  answers: Readonly<Record<string, AuditPairAnswer>>;
  /** Запись одного ответа в стор шага. */
  onAnswer: (questionId: string, value: AuditPairAnswer) => void;
};

/**
 * Список пар утверждений «а / б» — пользователь выбирает один из двух
 * вариантов в каждой паре. Карточка пары вертикально содержит два
 * варианта-кнопки во всю ширину; выбранный подсвечивается.
 * Универсальный компонент: шаги 1, 8, 18 (Кейрси), 20 (Томас–Килманн) и другие
 */
export function AuditPairsList({
  pairs,
  answers,
  onAnswer,
}: AuditPairsListProps): React.ReactElement {
  return (
    <ol className="space-y-3" type="1">
      {pairs.map((pair) => {
        const questionId = `q${String(pair.index)}`;
        const current = answers[questionId] ?? null;
        return (
          <li
            key={questionId}
            className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}
          >
            <p className={`${stepQuestionTitleClass} mb-3`}>
              <span className="mr-2 text-[#00B596]">{`${String(pair.index)}.`}</span>
              <span className="text-[#5F5E5E]">Выберите более близкое Вам утверждение:</span>
            </p>
            <div className="flex flex-col gap-2">
              <PairChoice
                letter="а"
                text={pair.optionA}
                isActive={current === "a"}
                onClick={() => onAnswer(questionId, "a")}
              />
              <PairChoice
                letter="б"
                text={pair.optionB}
                isActive={current === "b"}
                onClick={() => onAnswer(questionId, "b")}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PairChoice({
  letter,
  text,
  isActive,
  onClick,
}: {
  letter: string;
  text: string;
  isActive: boolean;
  onClick: () => void;
}): React.ReactElement {
  const base =
    "w-full text-left rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-[14px] sm:text-[15px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35 flex items-start gap-3";
  const activeCls =
    "bg-[#00B596] text-white shadow-[0px_4px_18px_0px_rgba(0,181,150,0.35)]";
  const inactiveCls =
    "bg-white/85 text-[#3A3A3A] hover:bg-white border border-black/10";
  const letterBase =
    "flex-none mt-[2px] inline-flex items-center justify-center w-7 h-7 rounded-full text-[14px] font-extrabold";
  const letterActive = "bg-white/20 text-white";
  const letterInactive = "bg-[#E8F7F3] text-[#00B596]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${isActive ? activeCls : inactiveCls}`}
    >
      <span className={`${letterBase} ${isActive ? letterActive : letterInactive}`}>
        {letter}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
    </button>
  );
}
