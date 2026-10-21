"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  AdminBulkActionButton,
  AdminBulkSelectionBar,
} from "@/components/admin/AdminBulkSelectionBar";
import { AdminRowMenuItem, AdminRowMoreMenu } from "@/components/admin/AdminRowMoreMenu";
import { AdminSelectCheckbox } from "@/components/admin/AdminSelectCheckbox";
import { AdminStatusChip } from "@/components/admin/ui/AdminUi";
import { InterviewCommissionMembersPanel } from "@/components/admin/InterviewCommissionMembersPanel";
import type { InterviewFolderCandidateSummary } from "@/lib/admin/candidateFolderTypes";
import { CANDIDATE_LIFECYCLE_INTERVIEW } from "@/lib/admin/candidateFolderTypes";
import type { ResolvedInterviewFolder } from "@/lib/admin/interviewFolders";
import {
  candidateAvatarInitials,
  formatVacancyTitleDisplay,
  interviewCandidateStatusChip,
  splitInterviewFolderDisplayName,
} from "@/lib/admin/interviewCandidateUi";
import { runBulkAdminActions } from "@/lib/admin/runBulkAdminActions";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminTextBackLinkClass,
} from "@/lib/admin/adminPanelTheme";
import { formatIsoCalendarDateRu } from "@/lib/datetime/moscowTime";
import { useBulkSelection } from "@/hooks/useBulkSelection";

export type InterviewFolderDetailPanelProps = {
  folderKey: string;
  /** В master-detail без ссылки «к списку». */
  embedded?: boolean;
};

/**
 * Детали папки вакансии: шапка, комиссия, список кандидатов строками.
 */
export function InterviewFolderDetailPanel({
  folderKey,
  embedded = false,
}: InterviewFolderDetailPanelProps): React.ReactElement {
  const [folder, setFolder] = useState<ResolvedInterviewFolder | null>(null);
  const [candidates, setCandidates] = useState<ReadonlyArray<InterviewFolderCandidateSummary>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [commissionEpoch, setCommissionEpoch] = useState(0);
  const selection = useBulkSelection(candidates, (candidate) => candidate.folderKey);

  const loadFolder = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/interview-folders?folderKey=${encodeURIComponent(folderKey)}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as {
        folder?: ResolvedInterviewFolder;
        candidates?: InterviewFolderCandidateSummary[];
        error?: string;
      };
      if (!res.ok || !body.folder || !body.candidates) {
        setError(body.error ?? "Папка не найдена.");
        setFolder(null);
        setCandidates([]);
        return;
      }
      setFolder(body.folder);
      setCandidates(body.candidates);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setFolder(null);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [folderKey]);

  useEffect(() => {
    if (folderKey) {
      void loadFolder();
    }
  }, [folderKey, loadFolder, commissionEpoch]);

  async function postCandidateLifecycle(
    targetKey: string,
    action: "hire" | "archive" | "restore"
  ): Promise<void> {
    const res = await fetch("/api/admin/candidate-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderKey: targetKey, action }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? "Не удалось выполнить действие.");
    }
  }

  async function bulkCandidateLifecycle(action: "hire" | "archive"): Promise<void> {
    const eligible = selection
      .getSelectedItems()
      .filter((candidate) => candidate.lifecycleStatus === CANDIDATE_LIFECYCLE_INTERVIEW);
    if (eligible.length === 0) {
      return;
    }
    const verb = action === "hire" ? "принять на работу" : "отправить в архив";
    if (
      !window.confirm(
        `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${String(eligible.length)} кандидатов?`
      )
    ) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    try {
      const result = await runBulkAdminActions(eligible.map((item) => item.folderKey), (key) =>
        postCandidateLifecycle(key, action)
      );
      if (result.failed > 0) {
        setError(
          result.lastError ??
            `Не удалось обработать ${String(result.failed)} из ${String(eligible.length)} кандидатов.`
        );
      }
      selection.clear();
      await loadFolder();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка папки…</p>;
  }

  if (error || !folder) {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <p className="text-sm font-medium text-red-700/90">{error ?? "Папка не найдена."}</p>
        {!embedded ? (
          <Link href="/admin/interview" className={adminTextBackLinkClass}>
            ‹ Собеседование
          </Link>
        ) : null}
      </div>
    );
  }

  const { title, datePart } = splitInterviewFolderDisplayName(folder.displayName);
  const vacancyTitle = formatVacancyTitleDisplay(folder.positionTitle || title);
  const firstScreeningLabel = datePart ?? formatIsoCalendarDateRu(folder.firstScreeningAt);
  const inCommissionCount = candidates.filter(
    (c) =>
      c.screeningReportSessions.length > 0 &&
      c.lifecycleStatus === CANDIDATE_LIFECYCLE_INTERVIEW
  ).length;

  return (
    <div className="space-y-5">
      {!embedded ? (
        <Link href="/admin/interview" className={adminTextBackLinkClass}>
          ‹ Собеседование
        </Link>
      ) : null}

      <div className="space-y-4">
        <div>
          <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[var(--admin-text)]">
            {vacancyTitle}
          </h2>
          <p className="mt-1 text-[14px] text-[var(--admin-text-3)]">
            Первый скрининг {firstScreeningLabel}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Кандидатов" value={String(folder.candidateCount)} />
          <StatTile label="Скрининга" value={String(folder.screeningCount)} />
          <StatTile label="В комиссии" value={String(inCommissionCount)} />
        </div>
      </div>

      <InterviewCommissionMembersPanel
        interviewFolderKey={folderKey}
        onMembersChanged={() => setCommissionEpoch((value) => value + 1)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[13px] font-medium text-[var(--admin-text-3)]">Кандидаты</p>
        <Link
          href="/admin/settings"
          className="text-[14px] font-medium text-[var(--admin-accent)] hover:underline"
        >
          Вопросы комиссии
        </Link>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {candidates.length === 0 ? (
        <div className={`px-6 py-6 ${adminPanelCardClass}`}>
          <p className={adminPanelMutedTextClass}>Кандидатов в этой папке пока нет.</p>
        </div>
      ) : (
        <>
          <AdminBulkSelectionBar
            selectedCount={selection.selectedCount}
            totalCount={candidates.length}
            allSelected={selection.allSelected}
            onToggleAll={selection.toggleAll}
            onClear={selection.clear}
            busy={bulkBusy}
          >
            <AdminBulkActionButton
              label="Принять на работу"
              disabled={bulkBusy}
              onClick={() => void bulkCandidateLifecycle("hire")}
            />
            <AdminBulkActionButton
              label="В архив"
              disabled={bulkBusy}
              onClick={() => void bulkCandidateLifecycle("archive")}
            />
          </AdminBulkSelectionBar>

          <div className={`overflow-hidden ${adminPanelCardClass}`}>
            <ul className="divide-y divide-[var(--admin-hairline)]">
              {candidates.map((candidate) => (
                <InterviewCandidateRow
                  key={candidate.folderKey}
                  candidate={candidate}
                  selected={selection.isSelected(candidate.folderKey)}
                  bulkBusy={bulkBusy}
                  onToggleSelect={() => selection.toggle(candidate.folderKey)}
                  onLifecycleChanged={loadFolder}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className={`px-4 py-4 ${adminPanelCardClass}`}>
      <p className="text-[13px] font-medium text-[var(--admin-text-3)]">{label}</p>
      <p className="mt-1 text-[24px] font-bold text-[var(--admin-text)]">{value}</p>
    </div>
  );
}

type InterviewCandidateRowProps = {
  candidate: InterviewFolderCandidateSummary;
  selected: boolean;
  bulkBusy: boolean;
  onToggleSelect: () => void;
  onLifecycleChanged: () => void | Promise<void>;
};

function InterviewCandidateRow({
  candidate,
  selected,
  bulkBusy,
  onToggleSelect,
  onLifecycleChanged,
}: InterviewCandidateRowProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [hasResume, setHasResume] = useState(candidate.hasResume);
  const status = interviewCandidateStatusChip(candidate);
  const folderHref = `/admin/results/${encodeURIComponent(candidate.folderKey)}`;
  const canLifecycle = candidate.lifecycleStatus === CANDIDATE_LIFECYCLE_INTERVIEW;

  async function uploadResume(file: File): Promise<void> {
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.set("folderKey", candidate.folderKey);
      formData.set("file", file);
      const res = await fetch("/api/admin/folder-files", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(body.error ?? "Не удалось загрузить резюме.");
        return;
      }
      setHasResume(true);
    } catch {
      window.alert("Сеть недоступна.");
    } finally {
      setUploadBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function runLifecycle(action: "hire" | "archive"): Promise<void> {
    const verb = action === "hire" ? "принять на работу" : "отправить в архив";
    if (!window.confirm(`${verb.charAt(0).toUpperCase()}${verb.slice(1)} кандидата?`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/candidate-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderKey: candidate.folderKey, action }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(body.error ?? "Не удалось выполнить действие.");
        return;
      }
      await onLifecycleChanged();
    } catch {
      window.alert("Сеть недоступна.");
    }
  }

  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <AdminSelectCheckbox
          checked={selected}
          disabled={bulkBusy}
          onChange={onToggleSelect}
          label={`Выбрать ${candidate.displayName}`}
          hideLabel
        />
        <Link
          href={folderHref}
          className="flex min-w-0 flex-1 items-center gap-3 transition hover:bg-[var(--admin-accent-tint-2)] -mx-2 rounded-xl px-2 py-1"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-avatar-bg-side)] text-[14px] font-semibold text-[var(--admin-accent)]">
            {candidateAvatarInitials(candidate.displayName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-[var(--admin-text)]">
              {candidate.displayName}
            </span>
            {candidate.positionLevelLabel ? (
              <span className="block truncate text-[13px] text-[var(--admin-text-3)]">
                {candidate.positionLevelLabel}
              </span>
            ) : null}
          </span>
          <CandidateStatusChip status={status} />
          <ResumeIcon uploaded={hasResume} />
          <span className="w-10 shrink-0 text-right text-[14px] font-medium text-[var(--admin-text-3)]">
            —
          </span>
          <span className="text-[var(--admin-chevron)]" aria-hidden>
            ›
          </span>
        </Link>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadResume(file);
            }
          }}
        />
        <AdminRowMoreMenu ariaLabel={`Действия: ${candidate.displayName}`}>
          <AdminRowMenuItem
            label={uploadBusy ? "Загрузка…" : "Загрузить резюме"}
            disabled={uploadBusy}
            onClick={() => inputRef.current?.click()}
          />
          {canLifecycle ? (
            <>
              <AdminRowMenuItem label="Принят на работу" onClick={() => void runLifecycle("hire")} />
              <AdminRowMenuItem label="В архив" onClick={() => void runLifecycle("archive")} />
            </>
          ) : null}
          <AdminRowMenuItem
            label="Вся папка кандидата"
            onClick={() => {
              window.location.href = folderHref;
            }}
          />
        </AdminRowMoreMenu>
      </div>
    </li>
  );
}

function CandidateStatusChip({
  status,
}: {
  status: ReturnType<typeof interviewCandidateStatusChip>;
}): React.ReactElement {
  if (status.forming) {
    return <AdminStatusChip label={status.label} tone="warn" />;
  }
  const tone =
    status.tone === "ok"
      ? "ok"
      : status.tone === "warn"
        ? "warn"
        : "neutral";
  return <AdminStatusChip label={status.label} tone={tone} />;
}

function ResumeIcon({ uploaded }: { uploaded: boolean }): React.ReactElement {
  const color = uploaded ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-3)]";
  return (
    <span className={`shrink-0 ${color}`} title={uploaded ? "Резюме загружено" : "Резюме не загружено"}>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 4h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M16 4v4h4M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
