"use client";

import React, { useState } from "react";

import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";

export type RegenerateReportKind =
  | "folder_document"
  | "attestation"
  | "burnout"
  | "prof_sb_education"
  | "specialist_screening";

type RegenerateDocumentReportButtonProps = {
  folderKey: string;
  sessionId: string;
  kind: RegenerateReportKind;
  documentId?: EmployeeDocumentSlotId;
  /** По умолчанию true — пересборка блоков с ИИ где применимо. */
  regenerateAi?: boolean;
  onSuccess?: (message: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  label?: string;
};

const DEFAULT_LABEL = "Перегенерировать отчёт";

/**
 * Кнопка повторной сборки отчёта через `/api/admin/reports/regenerate`.
 */
export function RegenerateDocumentReportButton({
  folderKey,
  sessionId,
  kind,
  documentId,
  regenerateAi = true,
  onSuccess,
  disabled = false,
  className,
  label = DEFAULT_LABEL,
}: RegenerateDocumentReportButtonProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    if (busy || disabled || !sessionId) {
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/reports/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderKey,
          sessionId,
          kind,
          documentId,
          regenerateAi,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !body.ok) {
        setFeedback(body.error ?? body.message ?? "Не удалось перегенерировать отчёт.");
        return;
      }
      const message = body.message ?? "Отчёт пересобран.";
      setFeedback(message);
      await onSuccess?.(message);
    } catch {
      setFeedback("Сеть недоступна.");
    } finally {
      setBusy(false);
    }
  }

  const buttonClass =
    className ??
    "rounded-full bg-white/80 px-4 py-2 text-[13px] font-bold text-[#5F5E5E] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.12)] disabled:opacity-50";

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className={buttonClass} disabled={busy || disabled} onClick={() => void handleClick()}>
        {busy ? "Пересобираю…" : label}
      </button>
      {feedback ? (
        <p className="max-w-md text-[12px] font-medium text-[#5F5E5E]/90" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
