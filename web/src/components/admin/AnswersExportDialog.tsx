"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import {
  ANSWERS_EXPORT_FORMAT_LABELS,
  ANSWERS_EXPORT_FORMATS,
  ANSWERS_EXPORT_TABLE_LAYOUT_LABELS,
  ANSWERS_EXPORT_TABLE_LAYOUTS,
  REPORT_EXPORT_TEST_KIND_LABELS,
  REPORT_EXPORT_TEST_KINDS,
  type AnswersExportFormat,
  type AnswersExportTableLayout,
  type ReportExportCandidate,
  type ReportExportScope,
  type ReportExportTestKind,
} from "@/lib/admin/answersExportKinds";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { stepInputClass, stepLabelClass, stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";

export type AnswersExportDialogProps = {
  open: boolean;
  onClose: () => void;
  initialFolderKeys?: ReadonlyArray<string>;
};

/** Выгрузка сырых ответов из БД (CSV / JSON). */
export function AnswersExportDialog({
  open,
  onClose,
  initialFolderKeys = [],
}: AnswersExportDialogProps): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [scope, setScope] = useState<ReportExportScope>("all_latest");
  const [testKind, setTestKind] = useState<ReportExportTestKind>("audit_middle");
  const [fileFormat, setFileFormat] = useState<AnswersExportFormat>("csv");
  const [tableLayout, setTableLayout] = useState<AnswersExportTableLayout>("combined");
  const [candidates, setCandidates] = useState<ReadonlyArray<ReportExportCandidate>>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<ReadonlySet<string>>(() => new Set());
  const [personQuery, setPersonQuery] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialFolderKeys.length > 0) {
      setScope("selected");
    }
    setError(null);
  }, [open, initialFolderKeys.length]);

  const loadCandidates = useCallback(async (kind: ReportExportTestKind): Promise<void> => {
    setLoadingCandidates(true);
    setError(null);
    try {
      const params = new URLSearchParams({ testKind: kind });
      const res = await fetch(`/api/admin/answers/export/candidates?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as {
        candidates?: ReportExportCandidate[];
        error?: string;
      };
      if (!res.ok || !body.candidates) {
        setCandidates([]);
        setError(body.error ?? "Не удалось загрузить список людей.");
        return;
      }
      setCandidates(body.candidates);

      const preselected = new Set<string>();
      if (initialFolderKeys.length > 0) {
        const folderSet = new Set(initialFolderKeys);
        for (const item of body.candidates) {
          if (item.folderKey && folderSet.has(item.folderKey)) {
            preselected.add(item.sessionId);
          }
        }
      }
      setSelectedSessionIds(preselected);
    } catch {
      setCandidates([]);
      setError("Не удалось загрузить список людей.");
    } finally {
      setLoadingCandidates(false);
    }
  }, [initialFolderKeys]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadCandidates(testKind);
  }, [open, testKind, loadCandidates]);

  const filteredCandidates = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) {
      return candidates;
    }
    return candidates.filter(
      (item) =>
        item.displayName.toLowerCase().includes(q) ||
        item.lastName.toLowerCase().includes(q) ||
        item.firstName.toLowerCase().includes(q)
    );
  }, [candidates, personQuery]);

  async function handleDownload(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { scope, testKind, format: fileFormat, tableLayout };
      if (scope === "selected") {
        body.sessionIds = [...selectedSessionIds];
        if (initialFolderKeys.length > 0) {
          body.folderKeys = [...initialFolderKeys];
        }
      }

      const res = await fetch("/api/admin/answers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errBody.error ?? "Не удалось сформировать выгрузку.");
        return;
      }

      const blob = await res.blob();
      const fileName = _fileNameFromDisposition(res.headers.get("Content-Disposition")) ?? "otvety.csv";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError("Не удалось скачать файл. Попробуйте выбрать меньше людей.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSession(sessionId: string): void {
    setSelectedSessionIds((previous) => {
      const next = new Set(previous);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  function toggleAllVisible(): void {
    setSelectedSessionIds((previous) => {
      const visibleIds = filteredCandidates.map((item) => item.sessionId);
      const allVisibleSelected = visibleIds.every((id) => previous.has(id));
      if (allVisibleSelected) {
        const next = new Set(previous);
        for (const id of visibleIds) {
          next.delete(id);
        }
        return next;
      }
      const next = new Set(previous);
      for (const id of visibleIds) {
        next.add(id);
      }
      return next;
    });
  }

  const canSubmit =
    !busy &&
    !loadingCandidates &&
    (scope === "all_latest" ||
      selectedSessionIds.size > 0 ||
      (scope === "selected" && initialFolderKeys.length > 0));

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        role="presentation"
        onClick={() => !busy && onClose()}
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden ${adminPanelCardClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="answers-export-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-black/5 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="answers-export-title" className={adminPanelSectionTitleClass}>
                Выгрузка ответов
              </h2>
              <p className={`mt-1 ${adminPanelMutedTextClass}`}>
                Ответы в таблице для сравнения: сверху — названия тестов и вопросов, слева —
                люди (или отдельный файл на каждого). JSON — полная структура из базы.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-black/10 bg-white text-[20px] text-[#8C8C8C]"
              aria-label="Закрыть"
              disabled={busy}
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <fieldset className="space-y-2">
            <legend className={stepLabelClass}>Кого включить</legend>
            <label className="flex cursor-pointer items-center gap-2 text-[14px]">
              <input
                type="radio"
                name="answers-export-scope"
                checked={scope === "all_latest"}
                onChange={() => setScope("all_latest")}
              />
              Все последние прохождения выбранного типа
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[14px]">
              <input
                type="radio"
                name="answers-export-scope"
                checked={scope === "selected"}
                onChange={() => setScope("selected")}
              />
              Выбрать отдельных людей
            </label>
          </fieldset>

          <div>
            <label htmlFor="answers-export-test-kind" className={`block ${stepLabelClass}`}>
              Тип теста
            </label>
            <select
              id="answers-export-test-kind"
              className={`${stepInputClass} h-12 w-full text-[15px]`}
              value={testKind}
              onChange={(event) => setTestKind(event.target.value as ReportExportTestKind)}
              disabled={busy}
            >
              {REPORT_EXPORT_TEST_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {REPORT_EXPORT_TEST_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className={stepLabelClass}>Формат</legend>
            {ANSWERS_EXPORT_FORMATS.map((format) => (
              <label key={format} className="flex cursor-pointer items-center gap-2 text-[14px]">
                <input
                  type="radio"
                  name="answers-export-format"
                  checked={fileFormat === format}
                  onChange={() => setFileFormat(format)}
                />
                {ANSWERS_EXPORT_FORMAT_LABELS[format]}
              </label>
            ))}
          </fieldset>

          {fileFormat !== "json" ? (
            <fieldset className="space-y-2">
              <legend className={stepLabelClass}>Вид таблицы (CSV)</legend>
              {ANSWERS_EXPORT_TABLE_LAYOUTS.map((layout) => (
                <label key={layout} className="flex cursor-pointer items-start gap-2 text-[14px]">
                  <input
                    type="radio"
                    name="answers-export-table-layout"
                    className="mt-1"
                    checked={tableLayout === layout}
                    onChange={() => setTableLayout(layout)}
                  />
                  {ANSWERS_EXPORT_TABLE_LAYOUT_LABELS[layout]}
                </label>
              ))}
            </fieldset>
          ) : null}

          {scope === "selected" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="answers-export-person-search" className={`block ${stepLabelClass}`}>
                    Люди
                  </label>
                  <input
                    id="answers-export-person-search"
                    type="search"
                    value={personQuery}
                    onChange={(event) => setPersonQuery(event.target.value)}
                    className={`${stepInputClass} h-11 w-full`}
                    placeholder="Поиск по ФИО"
                  />
                </div>
                <button
                  type="button"
                  className="text-[13px] font-bold text-[#007A68] underline-offset-2 hover:underline"
                  onClick={toggleAllVisible}
                  disabled={loadingCandidates || filteredCandidates.length === 0}
                >
                  Выбрать видимых
                </button>
              </div>
              {initialFolderKeys.length > 0 ? (
                <p className={`text-[13px] ${adminPanelMutedTextClass}`}>
                  Учтены {String(initialFolderKeys.length)} папок из списка результатов.
                </p>
              ) : null}
              <ul className="max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-black/10 bg-white/60 p-2">
                {loadingCandidates ? (
                  <li className={`px-3 py-4 ${adminPanelMutedTextClass}`}>Загрузка…</li>
                ) : filteredCandidates.length === 0 ? (
                  <li className={`px-3 py-4 ${adminPanelMutedTextClass}`}>
                    Нет прохождений этого типа теста.
                  </li>
                ) : (
                  filteredCandidates.map((item) => (
                    <li key={item.sessionId}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-2 hover:bg-black/[0.03]">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedSessionIds.has(item.sessionId)}
                          onChange={() => toggleSession(item.sessionId)}
                        />
                        <span className="min-w-0 text-[14px]">
                          <span className="font-bold text-[#5F5E5E]">{item.displayName}</span>
                          <span className={` block text-[12px] ${adminPanelMutedTextClass}`}>
                            {formatMoscowDateTime(item.completedAt)}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-red-700/90" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-black/5 px-5 py-4">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit}
            className={stepNavPrimaryButtonClass}
            onClick={() => void handleDownload()}
          >
            {busy ? "Формирование…" : "Скачать"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function _fileNameFromDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const asciiMatch = /filename="([^"]+)"/i.exec(header);
  return asciiMatch?.[1] ?? null;
}
