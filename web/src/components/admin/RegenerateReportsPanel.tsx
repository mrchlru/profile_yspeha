"use client";

import React, { useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import type { RegenerateStoredReportsResult } from "@/lib/admin/regenerateAllStoredReports";
import {
  REGENERATE_REPORT_BUCKET_LABELS,
  regenerateReportErrorKindLabel,
} from "@/lib/admin/regenerateReportKindLabels";
import { stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";

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
export function RegenerateReportsPanel(): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegenerateStoredReportsResult | null>(null);

  async function runRegenerate(): Promise<void> {
    if (!confirmed) {
      setError("Отметьте подтверждение перед запуском.");
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

  return (
    <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      <div>
        <h2 className={adminPanelSectionTitleClass}>Пересборка отчётов</h2>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Обновляет сохранённые данные отчётов по текущим шаблонам PDF и HTML для всех типов
          тестов в системе:
        </p>
        <ul className={`mt-2 list-inside list-disc space-y-1 ${adminPanelMutedTextClass}`}>
          <li>ОД и кадровый резерв</li>
          <li>ТУ, шефы и управляющие</li>
          <li>Скрининг кандидата</li>
          <li>ПРОФ СБ + ПРОФ образование</li>
          <li>Тест на выгорание (Маслач)</li>
        </ul>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Развёрнутое <span className="font-mono text-[13px]">ЗАКЛЮЧЕНИЕ (ИИ)</span> в полном PDF
          не перегенерируется — остаётся сохранённым. Для ОД/ТУ блок «Отчёт для руководителя»
          (пункты 1–12 и финальное заключение) пересчитывается по актуальным правилам. PDF в
          админке формируются заново при открытии; устаревшие PDF-копии в папках{" "}
          <span className="font-mono text-[13px]">report-*.pdf</span> удаляются.
        </p>
        <p className="mt-2 text-[13px] font-semibold text-amber-900">
          Операция может занять несколько минут. Не закрывайте вкладку до завершения.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={busy}
        />
        <span className={`text-[14px] leading-relaxed ${adminPanelMutedTextClass}`}>
          Я понимаю, что сохранённые JSON отчётов будут перезаписаны актуальной версией шаблона
          (без повторного вызова ИИ).
        </span>
      </label>

      <Button
        type="button"
        disabled={busy}
        onClick={() => void runRegenerate()}
        className={stepNavPrimaryButtonClass}
      >
        {busy ? "Пересборка…" : "Пересобрать все отчёты"}
      </Button>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-[14px] text-emerald-950"
          role="status"
        >
          <p className="font-extrabold">Готово</p>
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
      ) : null}
    </div>
  );
}
