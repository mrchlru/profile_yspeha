"use client";

import React from "react";

import {
  INVITE_STATUS_ACTIVE,
  INVITE_STATUS_EXPIRED,
  INVITE_STATUS_IN_PROGRESS,
  INVITE_STATUS_REVOKED,
  INVITE_STATUS_USED,
  type InviteStatus,
} from "@/lib/admin/inviteStatus";
import type { EmployeeFolderTypeFilter } from "@/lib/admin/buildEmployeeFolders";
import { adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import {
  AdminSearchField,
  AdminSegmentControl,
  AdminToggle,
} from "@/components/admin/ui/AdminUi";

export type CandidateSearchStatusFilter = InviteStatus | "all";
export type CandidateSearchTypeFilter = EmployeeFolderTypeFilter;

export type CandidateSearchPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter?: CandidateSearchStatusFilter;
  onStatusFilterChange?: (value: CandidateSearchStatusFilter) => void;
  typeFilter?: CandidateSearchTypeFilter;
  onTypeFilterChange?: (value: CandidateSearchTypeFilter) => void;
  archiveView?: boolean;
  onArchiveViewChange?: (value: boolean) => void;
  /** Скрыть иконки выгрузки (если они в шапке страницы). */
  hideExportActions?: boolean;
  reportExportAction?: {
    onClick: () => void;
    disabled?: boolean;
  };
  answersExportAction?: {
    onClick: () => void;
    disabled?: boolean;
  };
  similarityHighlight?: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    loading?: boolean;
  };
};

const STATUS_OPTIONS: ReadonlyArray<{ value: CandidateSearchStatusFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: INVITE_STATUS_ACTIVE, label: "Активен" },
  { value: INVITE_STATUS_IN_PROGRESS, label: "В процессе" },
  { value: INVITE_STATUS_USED, label: "Пройден" },
  { value: INVITE_STATUS_EXPIRED, label: "Истёк" },
  { value: INVITE_STATUS_REVOKED, label: "Отозван" },
];

const TYPE_OPTIONS: ReadonlyArray<{ value: CandidateSearchTypeFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "screening", label: "Скрининг" },
  { value: "audit", label: "ОД" },
  { value: "burnout", label: "Выгорание" },
  { value: "attestation", label: "Аттестация" },
];

/**
 * Общая панель поиска и фильтрации для приглашений и результатов.
 */
export function CandidateSearchPanel({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  archiveView,
  onArchiveViewChange,
  hideExportActions = false,
  reportExportAction,
  answersExportAction,
  similarityHighlight,
}: CandidateSearchPanelProps): React.ReactElement {
  const showExports =
    !hideExportActions && (reportExportAction || answersExportAction || similarityHighlight);

  return (
    <div className="space-y-4">
      <AdminSearchField
        id="candidate-search"
        value={query}
        onChange={onQueryChange}
        placeholder="Код, ФИО, дата рождения, должность…"
      />
      <p className={`px-1 ${adminPanelMutedTextClass}`}>
        Можно искать по отдельным полям или сочетаниям: «Иванов Иван», «12 июля 1978», «топ-менеджер».
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          {statusFilter !== undefined && onStatusFilterChange ? (
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--admin-text-3)]">
                Статус приглашения
              </p>
              <AdminSegmentControl
                ariaLabel="Статус приглашения"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={onStatusFilterChange}
              />
            </div>
          ) : null}

          {typeFilter !== undefined && onTypeFilterChange ? (
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--admin-text-3)]">Тип данных</p>
              <AdminSegmentControl
                ariaLabel="Тип данных"
                options={TYPE_OPTIONS}
                value={typeFilter}
                onChange={onTypeFilterChange}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {archiveView !== undefined && onArchiveViewChange ? (
            <div className="flex items-center gap-3">
              <span
                className={`text-[14px] font-medium ${
                  !archiveView ? "text-[var(--admin-text)]" : "text-[var(--admin-text-3)]"
                }`}
              >
                Активные
              </span>
              <AdminToggle
                checked={archiveView}
                onChange={onArchiveViewChange}
                label="Показать архив"
              />
              <span
                className={`text-[14px] font-medium ${
                  archiveView ? "text-[var(--admin-text)]" : "text-[var(--admin-text-3)]"
                }`}
              >
                Архив
              </span>
            </div>
          ) : null}

          {showExports ? (
            <div className="flex flex-wrap items-center gap-3">
              {similarityHighlight ? (
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--admin-text-2)]">
                    Схожие ответы
                    {similarityHighlight.loading ? "…" : null}
                  </span>
                  <AdminToggle
                    checked={similarityHighlight.enabled}
                    onChange={similarityHighlight.onChange}
                    disabled={similarityHighlight.disabled}
                    label="Подсветка схожих ответов"
                  />
                </div>
              ) : null}
              {answersExportAction ? (
                <ResultsExportIconButton
                  title="Экспорт таблицей"
                  ariaLabel="Экспорт таблицей"
                  disabled={answersExportAction.disabled}
                  onClick={answersExportAction.onClick}
                >
                  <AnswersExportIcon />
                </ResultsExportIconButton>
              ) : null}
              {reportExportAction ? (
                <ResultsExportIconButton
                  title="Скачать отчёты"
                  ariaLabel="Скачать отчёты"
                  disabled={reportExportAction.disabled}
                  onClick={reportExportAction.onClick}
                >
                  <ReportExportIcon />
                </ResultsExportIconButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ResultsExportIconButtonProps = {
  title: string;
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

/** Круглые иконки экспорта (шапка и фильтры). */
export function ResultsExportIconButton({
  title,
  ariaLabel,
  disabled = false,
  onClick,
  children,
}: ResultsExportIconButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-[var(--admin-shadow-card)] transition hover:bg-[var(--admin-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function AnswersExportIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>
  );
}

function ReportExportIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
      <path d="M9 17h6" />
    </svg>
  );
}
