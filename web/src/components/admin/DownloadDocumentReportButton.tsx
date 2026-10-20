"use client";

import React, { useState } from "react";

import type { DocumentReportDownloadKind } from "@/lib/admin/runSingleDocumentReportDownload";

type DownloadDocumentReportButtonProps = {
  folderKey: string;
  sessionId: string;
  kind: DocumentReportDownloadKind;
  disabled?: boolean;
  className?: string;
  label?: string;
};

const DEFAULT_LABEL = "Скачать Word";

/**
 * Скачивание отчёта без PDF-шаблона в формате .docx.
 */
export function DownloadDocumentReportButton({
  folderKey,
  sessionId,
  kind,
  disabled = false,
  className,
  label = DEFAULT_LABEL,
}: DownloadDocumentReportButtonProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/download-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, sessionId, folderKey }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Не удалось скачать файл.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const fileName = match?.[1] ? decodeURIComponent(match[1]) : "otchet.docx";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || busy}
        className={
          className ??
          "inline-flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/90 px-4 py-2 text-[14px] font-bold text-[#5F5E5E] transition hover:bg-white disabled:opacity-50"
        }
        onClick={() => void handleDownload()}
      >
        {busy ? "Формирование…" : label}
      </button>
      {error ? (
        <p className="max-w-xs text-right text-[12px] font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
