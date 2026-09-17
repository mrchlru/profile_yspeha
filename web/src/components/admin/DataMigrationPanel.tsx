"use client";

import React, { useRef, useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import type { MigrationImportResult } from "@/lib/admin/migrationArchiveTypes";
import {
  stepNavPrimaryButtonClass,
} from "@/lib/stepPageTheme";

type ImportMode = "skip" | "overwrite";

/**
 * Экспорт/импорт ZIP-архива БД для переноса Railway → Timeweb.
 */
export function DataMigrationPanel(): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [mode, setMode] = useState<ImportMode>("skip");
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<MigrationImportResult | null>(null);
  const [exportHint, setExportHint] = useState<string | null>(null);

  async function downloadExport(): Promise<void> {
    setError(null);
    setExportHint(null);
    setExportBusy(true);
    try {
      const res = await fetch("/api/admin/migration/export");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Не удалось скачать архив.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
      const rawName = match?.[1] ?? match?.[2] ?? "migration-archive.zip";
      const fileName = decodeURIComponent(rawName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportHint(`Скачан ${fileName} (${_formatBytes(blob.size)}).`);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setExportBusy(false);
    }
  }

  async function runImport(file: File): Promise<void> {
    setError(null);
    setImportResult(null);
    setImportBusy(true);
    try {
      const body = new FormData();
      body.set("mode", mode);
      body.set("file", file);
      const res = await fetch("/api/admin/migration/import", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as MigrationImportResult | { error?: string };
      if (!res.ok || !("tables" in json)) {
        setError(("error" in json && json.error) || "Импорт не выполнен.");
        return;
      }
      setImportResult(json);
    } catch {
      setError("Сеть недоступна или архив слишком большой для прокси.");
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      <div>
        <h2 className={adminPanelSectionTitleClass}>Миграция данных</h2>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Перенос между инстансами (Railway → Timeweb): скачайте ZIP на источнике, загрузите на
          приёмнике. Учётки HrD не входят в архив — их создайте заново в настройках. Прокторинг,
          файлы папок и отчёты переносятся вместе с таблицами.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={exportBusy || importBusy}
          onClick={() => void downloadExport()}
          className={stepNavPrimaryButtonClass}
        >
          {exportBusy ? "Сборка архива…" : "Скачать архив БД"}
        </Button>
      </div>

      {exportHint ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {exportHint}
        </p>
      ) : null}

      <div className="space-y-3 border-t border-[#DDDDDD] pt-5">
        <p className={adminPanelMutedTextClass}>
          Импорт на этом сервере. Режим{" "}
          <span className="font-semibold text-[#2F2F2F]">пропустить</span> — не трогать уже
          существующие записи;{" "}
          <span className="font-semibold text-[#2F2F2F]">перезаписать</span> — обновить по ключу.
        </p>
        <div className="flex flex-wrap gap-4 text-[14px]">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="migration-mode"
              checked={mode === "skip"}
              onChange={() => setMode("skip")}
              disabled={importBusy}
            />
            Пропустить существующие
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="migration-mode"
              checked={mode === "overwrite"}
              onChange={() => setMode("overwrite")}
              disabled={importBusy}
            />
            Перезаписать
          </label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="block w-full text-[14px]"
          disabled={importBusy || exportBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void runImport(file);
            }
          }}
        />
        {importBusy ? (
          <p className="text-sm font-medium text-[#5F5E5E]" role="status">
            Импорт… это может занять несколько минут.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {importResult ? <ImportResultSummary result={importResult} /> : null}
    </div>
  );
}

type ImportResultSummaryProps = {
  result: MigrationImportResult;
};

function ImportResultSummary({ result }: ImportResultSummaryProps): React.ReactElement {
  const inserted = result.tables.reduce((sum, table) => sum + table.inserted, 0);
  const updated = result.tables.reduce((sum, table) => sum + table.updated, 0);
  const skipped = result.tables.reduce((sum, table) => sum + table.skipped, 0);
  const failed = result.tables.reduce((sum, table) => sum + table.failed, 0);
  const withActivity = result.tables.filter(
    (table) => table.read > 0 || table.failed > 0
  );

  return (
    <div
      className={`rounded-2xl border px-4 py-4 text-[14px] ${
        failed > 0
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-emerald-300 bg-emerald-50 text-emerald-950"
      }`}
      role="status"
    >
      <p className="font-extrabold">
        {failed > 0 ? "Импорт завершён с ошибками" : "Импорт завершён"}
      </p>
      <p className="mt-2">
        Режим: {result.mode === "skip" ? "пропуск" : "перезапись"}. Добавлено {inserted}, обновлено{" "}
        {updated}, пропущено {skipped}, ошибок {failed}.
      </p>
      <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto font-mono text-[12px]">
        {withActivity.map((table) => (
          <li key={table.name}>
            {table.name}: read {table.read}, +{table.inserted}, ~{table.updated}, ={table.skipped},
            !{table.failed}
            {table.errors.length > 0 ? ` — ${table.errors[0]}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function _formatBytes(size: number): string {
  if (size < 1024) {
    return `${String(size)} Б`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} КБ`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}
