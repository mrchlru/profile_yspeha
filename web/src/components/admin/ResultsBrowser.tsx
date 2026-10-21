"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import {
  AdminBulkActionButton,
  AdminBulkSelectionBar,
} from "@/components/admin/AdminBulkSelectionBar";
import { AdminSelectCheckbox } from "@/components/admin/AdminSelectCheckbox";
import { AdminRowMenuItem, AdminRowMoreMenu } from "@/components/admin/AdminRowMoreMenu";
import { formatPersonMetaLine, formatPersonName } from "@/lib/admin/formatPersonDisplay";
import { formatAdminDateShort, formatAdminDateTimeTitle } from "@/lib/datetime/adminDateFormat";
import { CandidateSearchPanel } from "@/components/admin/CandidateSearchPanel";
import { AnswersExportDialog } from "@/components/admin/AnswersExportDialog";
import { ReportExportDialog } from "@/components/admin/ReportExportDialog";
import type { CandidateSearchTypeFilter } from "@/components/admin/CandidateSearchPanel";
import type { EmployeeFolderSummary } from "@/lib/admin/employeeFolderTypes";
import { similarityFolderCardClass } from "@/lib/admin/similarityClusterTheme";
import type { SimilarityFolderHint } from "@/lib/admin/similarityClusterTypes";
import { runBulkAdminActions } from "@/lib/admin/runBulkAdminActions";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
} from "@/lib/admin/adminPanelTheme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  buildResultsListCacheKey,
  clearResultsListCache,
  readResultsListCache,
  writeResultsListCache,
} from "@/lib/admin/resultsListCache";
import { adminSecondaryButtonClass } from "@/lib/admin/adminPanelTheme";
import { AdminTestChip } from "@/components/admin/ui/AdminUi";
export type ResultsHeaderExportHandlers = {
  onAnswersExport: () => void;
  onReportExport: () => void;
  exportDisabled: boolean;
};

export type ResultsBrowserProps = {
  hideExportActions?: boolean;
  onRegisterHeaderExports?: (handlers: ResultsHeaderExportHandlers | null) => void;
};

/**
 * Список папок сотрудников с поиском и фильтрацией.
 */
export function ResultsBrowser({
  hideExportActions = false,
  onRegisterHeaderExports,
}: ResultsBrowserProps = {}): React.ReactElement {
  const router = useRouter();
  const { session } = useAdminSession();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<CandidateSearchTypeFilter>("all");
  const [archiveView, setArchiveView] = useState(false);
  const debouncedQuery = useDebouncedValue(query);
  const initialCache = readResultsListCache(
    buildResultsListCacheKey("", "all", false)
  );
  const [items, setItems] = useState<ReadonlyArray<EmployeeFolderSummary>>(
    () => initialCache?.items ?? []
  );
  const [loading, setLoading] = useState(() => initialCache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [answersExportOpen, setAnswersExportOpen] = useState(false);
  const [similarityHints, setSimilarityHints] = useState<Record<string, SimilarityFolderHint>>({});
  const [similarityThreshold, setSimilarityThreshold] = useState(65);
  const [similaritySoftThreshold, setSimilaritySoftThreshold] = useState(60);
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityHighlightEnabled, setSimilarityHighlightEnabled] = useState(false);
  const isFullAdmin = session.status === "authenticated" && session.role === ADMIN_ROLE_ADMIN;
  const selection = useBulkSelection(items, (item) => item.key);

  async function loadSimilarity(type: CandidateSearchTypeFilter): Promise<void> {
    setSimilarityLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== "all") {
        params.set("type", type);
      }
      const res = await fetch(`/api/admin/results/similarity?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as {
        folderHints?: Record<string, SimilarityFolderHint>;
        thresholdPercent?: number;
        softThresholdPercent?: number;
        error?: string;
      };
      if (!res.ok || !body.folderHints) {
        setSimilarityHints({});
        return;
      }
      setSimilarityHints(body.folderHints);
      if (typeof body.thresholdPercent === "number") {
        setSimilarityThreshold(body.thresholdPercent);
      }
      if (typeof body.softThresholdPercent === "number") {
        setSimilaritySoftThreshold(body.softThresholdPercent);
      }
    } catch {
      setSimilarityHints({});
    } finally {
      setSimilarityLoading(false);
    }
  }

  async function loadItems(
    search: string,
    type: CandidateSearchTypeFilter,
    archive: boolean,
    options?: { silent?: boolean; force?: boolean }
  ): Promise<void> {
    const silent = options?.silent === true;
    const force = options?.force === true;
    const cacheKey = buildResultsListCacheKey(search, type, archive);
    const cached = force ? null : readResultsListCache(cacheKey);

    if (cached !== null) {
      setItems(cached.items);
      setLoading(false);
      setError(null);
      if (!force) {
        setRefreshing(true);
      }
    } else if (!silent) {
      setLoading(true);
      setError(null);
    } else {
      setRefreshing(true);
    }

    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (type !== "all") {
        params.set("type", type);
      }
      if (archive) {
        params.set("archive", "true");
      }
      const res = await fetch(`/api/admin/results?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as { items?: EmployeeFolderSummary[]; error?: string };
      if (!res.ok || !body.items) {
        if (cached === null) {
          setError(body.error ?? "Не удалось загрузить результаты.");
          setItems([]);
        }
        return;
      }
      writeResultsListCache(cacheKey, body.items);
      setItems(body.items);
      setError(null);
    } catch {
      if (cached === null) {
        setError("Сеть недоступна. Попробуйте ещё раз.");
        setItems([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const cacheKey = buildResultsListCacheKey(debouncedQuery, typeFilter, archiveView);
    const cached = readResultsListCache(cacheKey);
    void loadItems(debouncedQuery, typeFilter, archiveView, {
      silent: cached !== null,
    });
  }, [debouncedQuery, typeFilter, archiveView]);

  useEffect(() => {
    if (!similarityHighlightEnabled) {
      setSimilarityHints({});
      return;
    }
    void loadSimilarity(typeFilter);
  }, [similarityHighlightEnabled, typeFilter]);

  useEffect(() => {
    if (!onRegisterHeaderExports) {
      return;
    }
    onRegisterHeaderExports({
      onAnswersExport: () => setAnswersExportOpen(true),
      onReportExport: () => setExportOpen(true),
      exportDisabled: loading,
    });
    return () => onRegisterHeaderExports(null);
  }, [loading, onRegisterHeaderExports]);

  async function deleteFolder(item: EmployeeFolderSummary): Promise<void> {
    if (
      !window.confirm(
        `Удалить папку «${item.displayName}» со всеми данными? Это действие нельзя отменить.`
      )
    ) {
      return;
    }

    setDeletingKey(item.key);
    setError(null);
    try {
      await deleteFolderKey(item.key);
      clearResultsListCache();
      await loadItems(debouncedQuery, typeFilter, archiveView, { force: true });
      if (similarityHighlightEnabled) {
        await loadSimilarity(typeFilter);
      }
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setDeletingKey(null);
    }
  }

  async function postFolderArchive(folderKey: string, action: "archive" | "restore"): Promise<void> {
    const res = await fetch("/api/admin/folder-archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderKey, action }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? "Не удалось изменить статус папки.");
    }
  }

  async function changeFolderArchive(
    folderKey: string,
    action: "archive" | "restore"
  ): Promise<void> {
    await postFolderArchive(folderKey, action);
    clearResultsListCache();
    await loadItems(debouncedQuery, typeFilter, archiveView, { force: true });
  }

  async function deleteFolderKey(folderKey: string): Promise<void> {
    const res = await fetch("/api/admin/results", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderKey,
        target: { type: "folder" },
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? "Не удалось удалить папку.");
    }
  }

  async function bulkChangeArchive(action: "archive" | "restore"): Promise<void> {
    const eligible = selection.getSelectedItems().filter((item) =>
      action === "archive" ? !archiveView && !item.isArchived : archiveView && item.isArchived
    );
    if (eligible.length === 0) {
      return;
    }
    const verb = action === "archive" ? "отправить в архив" : "вернуть из архива";
    if (!window.confirm(`${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${String(eligible.length)} папок?`)) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    try {
      const result = await runBulkAdminActions(eligible.map((item) => item.key), (folderKey) =>
        postFolderArchive(folderKey, action)
      );
      if (result.failed > 0) {
        setError(
          result.lastError ??
            `Не удалось обработать ${String(result.failed)} из ${String(eligible.length)} папок.`
        );
      }
      selection.clear();
      clearResultsListCache();
      await loadItems(debouncedQuery, typeFilter, archiveView, { force: true });
      if (similarityHighlightEnabled) {
        await loadSimilarity(typeFilter);
      }
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDeleteFolders(): Promise<void> {
    const eligible = selection.getSelectedItems();
    if (eligible.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Удалить ${String(eligible.length)} папок со всеми данными? Это действие нельзя отменить.`
      )
    ) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    try {
      const result = await runBulkAdminActions(eligible.map((item) => item.key), (folderKey) =>
        deleteFolderKey(folderKey)
      );
      if (result.failed > 0) {
        setError(
          result.lastError ??
            `Не удалось удалить ${String(result.failed)} из ${String(eligible.length)} папок.`
        );
      }
      selection.clear();
      clearResultsListCache();
      await loadItems(debouncedQuery, typeFilter, archiveView, { force: true });
      if (similarityHighlightEnabled) {
        await loadSimilarity(typeFilter);
      }
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <CandidateSearchPanel
        query={query}
        onQueryChange={setQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        archiveView={archiveView}
        onArchiveViewChange={setArchiveView}
        hideExportActions={hideExportActions}
        compactFilterLabels
        reportExportAction={{
          onClick: () => setExportOpen(true),
          disabled: loading,
        }}
        answersExportAction={{
          onClick: () => setAnswersExportOpen(true),
          disabled: loading,
        }}
        similarityHighlight={{
          enabled: similarityHighlightEnabled,
          onChange: setSimilarityHighlightEnabled,
          disabled: loading,
          loading: similarityLoading,
        }}
      />

      <AnswersExportDialog
        open={answersExportOpen}
        onClose={() => setAnswersExportOpen(false)}
        initialFolderKeys={[...selection.selectedIds]}
      />

      <ReportExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialFolderKeys={[...selection.selectedIds]}
      />

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {refreshing && !loading ? (
        <p className={adminPanelMutedTextClass} aria-live="polite">
          Обновляем список в фоне…
        </p>
      ) : null}

      <AdminBulkSelectionBar
        selectedCount={selection.selectedCount}
        totalCount={items.length}
        allSelected={selection.allSelected}
        onToggleAll={selection.toggleAll}
        onClear={selection.clear}
        busy={bulkBusy || loading || deletingKey !== null}
      >
        {!archiveView ? (
          <AdminBulkActionButton
            label="В архив"
            disabled={bulkBusy}
            onClick={() => void bulkChangeArchive("archive")}
          />
        ) : (
          <AdminBulkActionButton
            label="Из архива"
            disabled={bulkBusy}
            onClick={() => void bulkChangeArchive("restore")}
          />
        )}
        {isFullAdmin ? (
          <AdminBulkActionButton
            label="Удалить"
            variant="danger"
            disabled={bulkBusy}
            onClick={() => void bulkDeleteFolders()}
          />
        ) : null}
      </AdminBulkSelectionBar>

      {similarityHighlightEnabled && Object.keys(similarityHints).length > 0 ? (
        <div className={`px-5 py-4 ${adminPanelCardClass}`}>
          <p className="text-[14px] font-bold text-[#5F5E5E]">
            Подсветка схожих ответов по субтестам
          </p>
          <p className={`mt-1 ${adminPanelMutedTextClass}`}>
            Красноватый/цветной — высокий риск (≥{String(similarityThreshold)}%), жёлтый — на
            грани ({String(similaritySoftThreshold)}–{String(similarityThreshold - 1)}%).
            Усиленная обводка — прохождения почти одновременно. Детали — в папке сотрудника.
            {similarityLoading ? " Обновление…" : null}
          </p>
        </div>
      ) : null}

      <div className={`overflow-hidden ${adminPanelCardClass}`}>
        {loading ? (
          <div className="px-6 py-10 text-[15px] text-[var(--admin-text-3)]">Загрузка папок…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10">
            <p className={adminPanelMutedTextClass}>
              {archiveView
                ? "В архиве папок по заданным условиям не найдено."
                : "Папок по заданным условиям не найдено."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--admin-hairline)]">
            {items.map((item) => {
              const hint = similarityHighlightEnabled ? similarityHints[item.key] : undefined;
              const rowHighlight =
                similarityHighlightEnabled && hint
                  ? similarityFolderCardClass(
                      hint.colorIndex,
                      hint.severity,
                      hint.hasCloseInTimeMatch
                    )
                  : "";
              const chips = folderTestChips(
                item,
                similarityHighlightEnabled && Boolean(hint)
              );
              const personName = formatPersonName(item);
              const personMeta = formatPersonMetaLine(item);
              return (
                <li key={item.key}>
                  <div
                    role="link"
                    tabIndex={0}
                    className={`group flex cursor-pointer flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-[var(--admin-accent-tint-2)] sm:px-5 ${rowHighlight}`}
                    onClick={() => {
                      router.push(`/admin/results/${encodeURIComponent(item.key)}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/admin/results/${encodeURIComponent(item.key)}`);
                      }
                    }}
                  >
                    <div
                      className="relative z-10 shrink-0"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <AdminSelectCheckbox
                        checked={selection.isSelected(item.key)}
                        disabled={bulkBusy || deletingKey === item.key}
                        onChange={() => selection.toggle(item.key)}
                        label={`Выбрать ${item.displayName}`}
                        hideLabel
                      />
                    </div>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--admin-avatar-bg)] text-[14px] font-semibold text-[var(--admin-accent)]">
                      {folderInitials(item)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-[var(--admin-text)]">
                          {personName}
                        </h3>
                        {item.isArchived ? (
                          <span className="text-[12px] font-medium text-[var(--admin-text-3)]">
                            Архив
                          </span>
                        ) : null}
                      </div>
                      {personMeta ? (
                        <p className="mt-0.5 text-[13px] text-[var(--admin-text-3)]">{personMeta}</p>
                      ) : null}
                      {similarityHighlightEnabled && hint ? (
                        <p className="mt-1 text-[13px] font-medium text-[#8B4513]">
                          {hint.severity === "soft" ? "На грани" : "Похожие субтесты"} · до ~
                          {String(hint.similarityPercent)}%
                        </p>
                      ) : null}
                      {chips.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chips.map((chip) => (
                            <AdminTestChip key={chip} label={chip} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div
                      className="ml-auto w-[72px] shrink-0 text-right text-[13px] text-[var(--admin-text-3)]"
                      title={
                        item.lastActivityAt
                          ? formatAdminDateTimeTitle(item.lastActivityAt)
                          : undefined
                      }
                    >
                      {item.lastActivityAt
                        ? formatAdminDateShort(item.lastActivityAt)
                        : "—"}
                    </div>
                    {isFullAdmin ? (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <AdminRowMoreMenu ariaLabel={`Действия для ${personName}`}>
                          {!archiveView && !item.isArchived ? (
                            <AdminRowMenuItem
                              label="В архив"
                              disabled={bulkBusy || deletingKey === item.key}
                              onClick={() => void changeFolderArchive(item.key, "archive")}
                            />
                          ) : null}
                          {archiveView && item.isArchived ? (
                            <AdminRowMenuItem
                              label="Из архива"
                              disabled={bulkBusy || deletingKey === item.key}
                              onClick={() => void changeFolderArchive(item.key, "restore")}
                            />
                          ) : null}
                          <AdminRowMenuItem
                            label={deletingKey === item.key ? "Удаление…" : "Удалить"}
                            tone="danger"
                            disabled={bulkBusy || deletingKey === item.key}
                            onClick={() => void deleteFolder(item)}
                          />
                        </AdminRowMoreMenu>
                      </div>
                    ) : null}
                    <span className="text-[var(--admin-chevron)]" aria-hidden>
                      ›
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          void loadItems(debouncedQuery, typeFilter, archiveView, { force: true });
          if (similarityHighlightEnabled) {
            void loadSimilarity(typeFilter);
          }
        }}
        disabled={loading || refreshing}
        className={adminSecondaryButtonClass}
      >
        Обновить список
      </button>
    </div>
  );
}

function folderInitials(item: EmployeeFolderSummary): string {
  const a = item.lastName?.trim().charAt(0) ?? "";
  const b = item.firstName?.trim().charAt(0) ?? "";
  const pair = `${a}${b}`.toUpperCase();
  if (pair) {
    return pair;
  }
  return item.displayName.trim().charAt(0).toUpperCase() || "?";
}

function folderTestChips(
  item: EmployeeFolderSummary,
  similarAnswers: boolean
): string[] {
  const chips: string[] = [];
  if (similarAnswers) {
    chips.push("Схожие ответы");
  }
  if (item.hasScreening || item.pendingInvite) {
    chips.push("Скрининг");
  }
  if (item.hasAudit) {
    chips.push("ОД");
  }
  if (item.hasProfSbEducation) {
    chips.push("ПРОФ СБ");
  }
  if (item.hasBurnout) {
    chips.push("Выгорание");
  }
  if (item.hasSpecialistScreening) {
    chips.push("Спец. скрининг");
  }
  if (item.hasAttestation) {
    chips.push("Аттестация");
  }
  return chips;
}
