"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/Button";
import {
  commissionBankPickerDialogClass,
  commissionBankPickerFooterClass,
  commissionBankPickerHeaderClass,
  commissionBankPickerItemButtonClass,
  commissionBankPickerListClass,
  commissionBankPickerOverlayClass,
  commissionBankPickerRootClass,
  commissionEvalBodyTextClass,
  commissionEvalInputClass,
  commissionEvalSecondaryButtonClass,
} from "@/lib/commission/commissionEvalTheme";
import {
  formatRussianQuestionCount,
  normalizeCommissionQuestionText,
} from "@/lib/commission/commissionQuestionTextUtils";

export type CommissionQuestionBankItem = {
  id: string;
  text: string;
};

export type CommissionQuestionBankPickerProps = {
  questions: ReadonlyArray<CommissionQuestionBankItem>;
  /** Тексты, уже выбранные в других полях этой анкеты. */
  excludedTexts?: ReadonlySet<string>;
  /** Сколько вопросов занято другими участниками (для подсказки). */
  reservedByOthersCount?: number;
  onSelect: (text: string) => void;
  onClose: () => void;
};

/**
 * Модальное окно выбора вопроса из банка комиссии.
 */
export function CommissionQuestionBankPicker({
  questions,
  excludedTexts,
  reservedByOthersCount = 0,
  onSelect,
  onClose,
}: CommissionQuestionBankPickerProps): React.ReactElement | null {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${String(scrollY)}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return questions.filter((item) => {
      if (excludedTexts?.has(normalizeCommissionQuestionText(item.text))) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return item.text.toLowerCase().includes(normalizedQuery);
    });
  }, [excludedTexts, query, questions]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className={commissionBankPickerRootClass}>
      <div
        className={commissionBankPickerOverlayClass}
        role="presentation"
        onClick={onClose}
      />
      <div
        className={commissionBankPickerDialogClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commission-bank-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={commissionBankPickerHeaderClass}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2
                id="commission-bank-picker-title"
                className="break-words text-[17px] font-extrabold leading-tight text-[#5F5E5E] sm:text-[20px]"
              >
                Вопрос из банка
              </h2>
              <p className={`mt-1 break-words ${commissionEvalBodyTextClass}`}>
                Выберите вопрос, который ещё не занят другими участниками комиссии.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/90 text-[20px] leading-none text-[#8C8C8C]"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {reservedByOthersCount > 0 ? (
            <p className="mt-3 break-words rounded-2xl bg-amber-50 px-2.5 py-2 text-[12px] font-medium leading-relaxed text-amber-900 sm:px-3 sm:text-[14px]">
              {reservedByOthersCount === 1
                ? "Другой участник уже выбрал 1 вопрос — он скрыт из списка."
                : `Другие участники уже выбрали ${formatRussianQuestionCount(reservedByOthersCount)} — они скрыты из списка.`}
            </p>
          ) : null}

          <label className="mt-3 block min-w-0 text-[13px] font-normal text-[#5F5E5E] sm:text-[14px]">
            Поиск
            <input
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={commissionEvalInputClass}
              placeholder="Продажи, мотивация…"
              autoFocus
            />
          </label>
        </div>

        <ul className={commissionBankPickerListClass}>
          {filteredQuestions.length === 0 ? (
            <li className={`px-1 py-6 text-center ${commissionEvalBodyTextClass}`}>
              <p className="break-words">
                {questions.length === 0
                  ? "Свободных вопросов в банке нет. Сформулируйте свой вопрос вручную в анкете."
                  : "По запросу ничего не найдено. Измените поиск или введите свой вопрос."}
              </p>
            </li>
          ) : (
            filteredQuestions.map((item) => (
              <li key={item.id} className="mb-2 last:mb-0">
                <button
                  type="button"
                  className={commissionBankPickerItemButtonClass}
                  onClick={() => onSelect(item.text)}
                >
                  <span className="block break-words">{item.text}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className={commissionBankPickerFooterClass}>
          <p className="mb-2 break-words text-center text-[12px] text-[#8C8C8C] sm:hidden">
            Доступно: {String(filteredQuestions.length)}
          </p>
          <Button
            type="button"
            variant="secondary"
            className={commissionEvalSecondaryButtonClass}
            onClick={onClose}
          >
            Закрыть
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
