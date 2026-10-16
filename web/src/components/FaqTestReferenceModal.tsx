"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import {
  getFaqTestReferenceDetails,
  getFaqTestReferenceTable,
} from "@/lib/support/faqTestReference";

type FaqTestReferenceModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Справочник тестов из таблицы заказчика: сводная таблица и полные тексты по листам.
 */
export function FaqTestReferenceModal({
  open,
  onClose,
}: FaqTestReferenceModalProps): React.ReactElement | null {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const tableRows = getFaqTestReferenceTable();
  const detailSheets = getFaqTestReferenceDetails();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const handleBackdropClick = useCallback((): void => {
    onClose();
  }, [onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/40"
        role="presentation"
        onClick={handleBackdropClick}
      />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-black/10 bg-[#F4F4F4] shadow-[0px_12px_48px_rgba(0,0,0,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-[20px] font-extrabold text-[#4F4F4F] sm:text-[22px]">
              Справочник по тестам
            </h2>
            <p className="mt-1 text-[14px] leading-snug text-[#6B6B6B]">
              Сводная таблица и полные описания методик (как в справочном файле заказчика).
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[20px] text-[#8C8C8C]"
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-4 py-5 sm:px-6">
          <section>
            <h3 className="mb-3 text-[16px] font-extrabold text-[#4F4F4F]">Сводная таблица</h3>
            <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
              <table className="min-w-[720px] w-full text-left text-[13px] leading-snug text-[#4F4F4F]">
                <thead>
                  <tr className="border-b border-black/10 bg-[#ECECEC] text-[12px] font-bold uppercase tracking-wide text-[#6B6B6B]">
                    <th className="px-3 py-3 align-top">Наименование теста</th>
                    <th className="px-3 py-3 align-top">Свойства человека</th>
                    <th className="px-3 py-3 align-top">Возможные значения</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => (
                    <tr
                      key={`${row.testName}-${index}`}
                      className="border-t border-black/5 align-top even:bg-[#FAFAFA]"
                    >
                      <td className="px-3 py-2.5 font-semibold whitespace-pre-wrap">{row.testName}</td>
                      <td className="px-3 py-2.5 whitespace-pre-wrap">{row.propertyDescription}</td>
                      <td className="px-3 py-2.5 whitespace-pre-wrap">{row.possibleValues}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[16px] font-extrabold text-[#4F4F4F]">Полные описания</h3>
            {detailSheets.map((sheet) => (
              <details
                key={sheet.sheetTitle}
                className="group rounded-2xl border border-black/10 bg-white px-4 py-3 open:pb-4"
              >
                <summary className="cursor-pointer list-none text-[15px] font-bold text-[#007A68] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <span className="text-[#8C8C8C] transition group-open:rotate-90">▸</span>
                    {sheet.sheetTitle}
                  </span>
                </summary>
                <div className="mt-3 space-y-2 border-t border-black/5 pt-3 text-[14px] leading-relaxed text-[#4F4F4F]">
                  {sheet.lines.map((line) => (
                    <p key={line.slice(0, 80)} className="whitespace-pre-wrap">
                      {line}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
