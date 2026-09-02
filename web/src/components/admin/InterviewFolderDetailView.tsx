"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { CandidateLifecycleButtons } from "@/components/admin/CandidateLifecycleButtons";
import {
  AdminBulkActionButton,
  AdminBulkSelectionBar,
} from "@/components/admin/AdminBulkSelectionBar";
import { AdminSelectCheckbox } from "@/components/admin/AdminSelectCheckbox";
import { InterviewCandidateResumePanel } from "@/components/admin/InterviewCandidateResumePanel";
import { InterviewCandidateScreeningPanel } from "@/components/admin/InterviewCandidateScreeningPanel";
import { InterviewCommissionEvalPanel } from "@/components/admin/InterviewCommissionEvalPanel";
import { InterviewCommissionMembersPanel } from "@/components/admin/InterviewCommissionMembersPanel";
import type { InterviewFolderCandidateSummary } from "@/lib/admin/candidateFolderTypes";
import { CANDIDATE_LIFECYCLE_INTERVIEW } from "@/lib/admin/candidateFolderTypes";
import { runBulkAdminActions } from "@/lib/admin/runBulkAdminActions";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { useBulkSelection } from "@/hooks/useBulkSelection";

type InterviewFolderDetail = {
  key: string;
  displayName: string;
  positionTitle: string;
};

/**
 * Детальная папка вакансии в разделе «Собеседование».
 */
export function InterviewFolderDetailView(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.folderKey ?? ""));
  const [folder, setFolder] = useState<InterviewFolderDetail | null>(null);
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
        folder?: InterviewFolderDetail;
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
  }, [folderKey, loadFolder]);

  async function postCandidateLifecycle(
    folderKey: string,
    action: "hire" | "archive" | "restore"
  ): Promise<void> {
    const res = await fetch("/api/admin/candidate-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderKey, action }),
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
      const result = await runBulkAdminActions(eligible.map((item) => item.folderKey), (folderKey) =>
        postCandidateLifecycle(folderKey, action)
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
        <Link
          href="/admin/interview"
          className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К списку папок
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
            Вакансия
          </p>
          <h2 className="text-[24px] font-extrabold text-[#5F5E5E]">{folder.displayName}</h2>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>Должность: {folder.positionTitle}</p>
        </div>
        <Link
          href="/admin/interview"
          className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К списку папок
        </Link>
      </div>

      <InterviewCommissionMembersPanel
        interviewFolderKey={folderKey}
        onMembersChanged={() => setCommissionEpoch((value) => value + 1)}
      />

      <div className={`px-5 py-5 ${adminPanelCardClass}`}>
        <h3 className={adminPanelSectionTitleClass}>Кандидаты</h3>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Кандидаты после скрининга по этой вакансии. Загрузите резюме в карточку кандидата.
          После решения комиссии — «Принят на работу» или «В архив».
        </p>
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

          <div className="grid gap-4 lg:grid-cols-2">
          {candidates.map((candidate) => (
            <div key={candidate.folderKey} className={`space-y-4 px-5 py-5 ${adminPanelCardClass}`}>
              <div className="flex items-start gap-3">
                <AdminSelectCheckbox
                  checked={selection.isSelected(candidate.folderKey)}
                  disabled={bulkBusy}
                  onChange={() => selection.toggle(candidate.folderKey)}
                  label={`Выбрать ${candidate.displayName}`}
                  hideLabel
                />
                <div className="min-w-0 flex-1">
                  <h3 className={adminPanelSectionTitleClass}>{candidate.displayName}</h3>
                  {candidate.positionLevelLabel ? (
                    <p className={`mt-1 ${adminPanelMutedTextClass}`}>
                      Уровень: {candidate.positionLevelLabel}
                    </p>
                  ) : null}
                </div>
              </div>

              <InterviewCandidateScreeningPanel
                candidateFolderKey={candidate.folderKey}
                hasScreening={candidate.hasScreening}
                pendingInvite={candidate.pendingInvite}
                screeningSessions={candidate.screeningSessions}
                screeningReportSessions={candidate.screeningReportSessions}
              />

              <InterviewCandidateResumePanel
                candidateFolderKey={candidate.folderKey}
                candidateName={candidate.displayName}
              />

              <InterviewCommissionEvalPanel
                interviewFolderKey={folderKey}
                candidateFolderKey={candidate.folderKey}
                candidateName={candidate.displayName}
                refreshToken={commissionEpoch}
              />

              <CandidateLifecycleButtons
                folderKey={candidate.folderKey}
                lifecycleStatus={candidate.lifecycleStatus}
                context="interview"
                onChanged={loadFolder}
                disabled={bulkBusy}
              />
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
