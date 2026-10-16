"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { getDashboardMethodologyInfo } from "@/lib/admin/dashboardMethodologyInfo";
import type { DashboardMethodologyInfoId } from "@/lib/admin/dashboardMethodologyInfoTypes";

export type DashboardMethodologyInfoButtonProps = {
  infoId: DashboardMethodologyInfoId;
  /** Подпись для кнопки (скринридер). */
  ariaLabel?: string;
  className?: string;
};

/**
 * Компактная кнопка «i» со справочной плашкой о методике.
 */
export function DashboardMethodologyInfoButton({
  infoId,
  ariaLabel,
  className,
}: DashboardMethodologyInfoButtonProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const info = getDashboardMethodologyInfo(infoId);
  const label = ariaLabel ?? `Справка: ${info.title}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        className={
          className ??
          "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[#C5D4CF] bg-[#F4F6F5] text-[11px] font-bold leading-none text-[#8C8C8C] transition hover:border-[#00B596]/40 hover:bg-white hover:text-[#007A68]"
        }
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        i
      </button>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
              <div className="absolute inset-0 bg-black/35" role="presentation" onClick={close} />
              <div
                className={`relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden ${adminPanelCardClass}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-black/5 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 id={titleId} className={`${adminPanelSectionTitleClass} text-[16px]`}>
                      {info.title}
                    </h2>
                    <button
                      type="button"
                      className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[18px] text-[#8C8C8C]"
                      aria-label="Закрыть"
                      onClick={close}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className={`flex-1 space-y-4 overflow-y-auto px-5 py-4 ${adminPanelMutedTextClass}`}>
                  {info.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)} className="text-[14px] leading-relaxed text-[#5F5E5E]">
                      {paragraph}
                    </p>
                  ))}
                  {info.tableRows && info.tableRows.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white/80">
                      <table className="min-w-full text-left text-[13px] text-[#5F5E5E]">
                        <thead>
                          <tr className="border-b border-black/10 bg-[#F4F6F5] text-[11px] font-bold uppercase text-[#8C8C8C]">
                            <th className="px-3 py-2 align-top">Свойства</th>
                            <th className="px-3 py-2 align-top">Возможные значения</th>
                          </tr>
                        </thead>
                        <tbody>
                          {info.tableRows.map((row) => (
                            <tr key={`${row.propertyDescription.slice(0, 32)}-${row.possibleValues.slice(0, 32)}`} className="border-t border-black/5 align-top">
                              <td className="px-3 py-2 whitespace-pre-wrap">{row.propertyDescription || "—"}</td>
                              <td className="px-3 py-2 whitespace-pre-wrap">{row.possibleValues}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {info.sections?.map((section) => (
                    <div key={section.title}>
                      <p className="text-[13px] font-bold text-[#5F5E5E]">{section.title}</p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-[#5F5E5E]">
                        {section.items.map((item) => (
                          <li key={item.slice(0, 64)}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
