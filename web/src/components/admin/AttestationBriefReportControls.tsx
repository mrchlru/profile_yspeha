"use client";

import React, { useState } from "react";

import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin/adminPanelTheme";

type AttestationBriefReportControlsProps = {
  folderKey: string;
  sessionId: string;
  hasBriefReport: boolean;
  onBriefGenerated?: () => void | Promise<void>;
};

/**
 * Скачивание и генерация краткого отчёта по аттестации (Word).
 */
export function AttestationBriefReportControls({
  folderKey,
  sessionId,
  hasBriefReport,
  onBriefGenerated,
}: AttestationBriefReportControlsProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadHref = `/api/admin/attestation-report/brief-docx?${new URLSearchParams({
    folderKey,
    sessionId,
  }).toString()}`;

  async function handleGenerate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/attestation-report/generate-brief-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderKey, sessionId }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Не удалось сформировать краткий отчёт.");
        return;
      }
      await onBriefGenerated?.();
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {hasBriefReport ? (
          <a
            href={downloadHref}
            className={adminSecondaryButtonClass}
          >
            Краткий отчёт
          </a>
        ) : (
          <button
            type="button"
            disabled={busy}
            className={adminPrimaryButtonClass}
            onClick={() => void handleGenerate()}
          >
            {busy ? "Идёт генерация…" : "Краткий отчёт"}
          </button>
        )}
      </div>
      {error ? (
        <p className="max-w-xs text-right text-[12px] font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
