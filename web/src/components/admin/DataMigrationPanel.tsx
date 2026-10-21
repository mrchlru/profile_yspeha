"use client";

import React, { useRef, useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin/adminPanelTheme";
import type { MigrationImportResult } from "@/lib/admin/migrationArchiveTypes";

type ImportMode = "skip" | "overwrite";

export type DataMigrationPanelProps = {
  embedded?: boolean;
};

/**
 * Экспорт/импорт ZIP-архива БД для переноса между серверами.
 */
export function DataMigrationPanel({
  embedded = false,
}: DataMigrationPanelProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [mode, setMode] = useState<ImportMode>("skip");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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
      setPendingFile(null);
    } catch {
      setError("Сеть недоступна или архив слишком большой для прокси.");
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const content = (
    <>
      {!embedded ? (
        <div>
          <h2 className={adminPanelSectionTitleClass}>Миграция данных</h2>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>
            Скачайте архив на одном сервере и загрузите на другом.
          </p>
        </div>
      ) : (
        <p className={adminPanelMutedTextClass}>
          Учётные записи HrD в архив не входят — создайте их в настройках на новом сервере.
        </p>
      )}

      <Button
        type="button"
        disabled={exportBusy || importBusy}
        onClick={() => void downloadExport()}
        className={adminSecondaryButtonClass}
      >
        {exportBusy ? "Сборка…" : "Скачать архив"}
      </Button>

      {exportHint ? (
        <p className="text-sm font-medium text-[var(--admin-ok)]" role="status">
          {exportHint}
        </p>
      ) : null}

      <fieldset className="space-y-3 border-t border-[var(--admin-hairline)] pt-4">
        <legend className={`text-[14px] font-medium ${adminPanelMutedTextClass}`}>Импорт</legend>
        <div className="flex flex-wrap gap-4 text-[14px] text-[var(--admin-text-2)]">
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
        <label className="block text-[13px] font-medium text-[var(--admin-text-3)]">
          Файл архива (.zip)
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="mt-2 block w-full rounded-xl bg-[var(--admin-field)] px-3 py-2 text-[14px]"
            disabled={importBusy || exportBusy}
            onChange={(event) => {
              setPendingFile(event.target.files?.[0] ?? null);
              setImportResult(null);
            }}
          />
        </label>
        <Button
          type="button"
          disabled={!pendingFile || importBusy || exportBusy}
          onClick={() => {
            if (pendingFile) {
              void runImport(pendingFile);
            }
          }}
          className={adminPrimaryButtonClass}
        >
          {importBusy ? "Импорт…" : "Импортировать"}
        </Button>
        {importBusy ? (
          <p className={`text-sm ${adminPanelMutedTextClass}`} role="status">
            Импорт может занять несколько минут.
          </p>
        ) : null}
      </fieldset>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {importResult ? <ImportResultSummary result={importResult} /> : null}
    </>
  );

  return (
    <div className={embedded ? "space-y-4" : `space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      {content}
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
          ? "border-[var(--admin-warn)]/40 bg-[var(--admin-warn-bg)] text-[var(--admin-text-1)]"
          : "border-[var(--admin-ok)]/30 bg-[var(--admin-ok-bg)]"
      }`}
      role="status"
    >
      <p className="font-semibold">
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
