"use client";

import React, { useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
  adminPrimaryButtonClass,
} from "@/lib/admin/adminPanelTheme";
import type { RegenerateStoredReportsResult } from "@/lib/admin/regenerateAllStoredReports";
import {
  REGENERATE_REPORT_BUCKET_LABELS,
  regenerateReportErrorKindLabel,
} from "@/lib/admin/regenerateReportKindLabels";

function _bucketLine(
  label: string,
  stats: {
    total: number;
    updated: number;
    failed: number;
    pdfVerified?: number;
    managerPdfVerified?: number;
  }
): string {
  const pdfPart =
    stats.pdfVerified !== undefined
      ? `, PDF полный: ${String(stats.pdfVerified)}`
      : "";
  const managerPdfPart =
    stats.managerPdfVerified !== undefined
      ? `, PDF руководителя: ${String(stats.managerPdfVerified)}`
      : "";
  return `${label}: обновлено ${String(stats.updated)} из ${String(stats.total)}${pdfPart}${managerPdfPart}, ошибок: ${String(stats.failed)}`;
}

/**
 * Пересборка всех отчётов по актуальным шаблонам (только главный администратор).
 */
export type RegenerateReportsPanelProps = {
  embedded?: boolean;
};

export function RegenerateReportsPanel({
  embedded = false,
}: RegenerateReportsPanelProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegenerateStoredReportsResult | null>(null);

  async function runRegenerate(): Promise<void> {
    if (
      !window.confirm(
        "Пересобрать все сохранённые отчёты по текущим шаблонам? Операция может занять несколько минут."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/reports/regenerate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = (await res.json()) as RegenerateStoredReportsResult | { error?: string };
      if (!res.ok) {
        setError("error" in body && body.error ? body.error : "Не удалось пересобрать отчёты.");
        return;
      }
      if (!("managerAssessments" in body)) {
        setError("Некорректный ответ сервера.");
        return;
      }
      setResult(body);
    } catch {
      setError("Сеть недоступна или операция прервана по таймауту. Проверьте логи сервера.");
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
      {!embedded ? (
        <div>
          <h2 className={adminPanelSectionTitleClass}>Пересборка отчётов</h2>
        </div>
      ) : (
        <p className={adminPanelMutedTextClass}>
          Обновление сохранённых отчётов по текущим шаблонам для всех типов тестов.
        </p>
      )}

      <Button
        type="button"
        disabled={busy}
        onClick={() => void runRegenerate()}
        className={adminPrimaryButtonClass}
      >
        {busy ? "Пересборка…" : "Запустить"}
      </Button>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

    </>
  );

  const resultBlock = result ? (
        <div
          className="rounded-2xl border border-[var(--admin-ok)]/30 bg-[var(--admin-ok-bg)] px-4 py-4 text-[14px]"
          role="status"
        >
          <p className="font-semibold text-[var(--admin-ok)]">Готово</p>
          <ul className="mt-3 space-y-1">
            <li>{_bucketLine(REGENERATE_REPORT_BUCKET_LABELS.managerAssessments, result.managerAssessments)}</li>
            <li>{_bucketLine(REGENERATE_REPORT_BUCKET_LABELS.screening, result.screening)}</li>
            <li>{_bucketLine(REGENERATE_REPORT_BUCKET_LABELS.profSbEducation, result.profSbEducation)}</li>
            <li>{_bucketLine(REGENERATE_REPORT_BUCKET_LABELS.burnout, result.burnout)}</li>
            <li>Удалено PDF-копий в папках: {String(result.deletedFolderPdfCopies)}</li>
          </ul>
          {result.errors.length > 0 ? (
            <div className="mt-4">
              <p className="font-bold">Примеры ошибок (до 50):</p>
              <ul className="mt-2 max-h-40 overflow-y-auto text-[12px]">
                {result.errors.map((item) => (
                  <li key={`${item.kind}-${item.sessionId}`}>
                    [{regenerateReportErrorKindLabel(item.kind)}] {item.sessionId}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
  ) : null;

  return (
    <div className={embedded ? "space-y-4" : `space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      {body}
      {resultBlock}
    </div>
  );
}
