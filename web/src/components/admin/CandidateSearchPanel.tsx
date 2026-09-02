"use client";

import React from "react";

import {
  INVITE_STATUS_ACTIVE,
  INVITE_STATUS_EXPIRED,
  INVITE_STATUS_REVOKED,
  INVITE_STATUS_USED,
  type InviteStatus,
} from "@/lib/admin/inviteStatus";
import { ADMIN_EMPLOYEE_ASSESSMENT_LABEL } from "@/lib/access/testKinds";
import { adminPanelCardClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import { stepInputClass, stepLabelClass } from "@/lib/stepPageTheme";

export type CandidateSearchStatusFilter = InviteStatus | "all";
export type CandidateSearchTypeFilter = "all" | "screening" | "audit";

export type CandidateSearchPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter?: CandidateSearchStatusFilter;
  onStatusFilterChange?: (value: CandidateSearchStatusFilter) => void;
  typeFilter?: CandidateSearchTypeFilter;
  onTypeFilterChange?: (value: CandidateSearchTypeFilter) => void;
  archiveView?: boolean;
  onArchiveViewChange?: (value: boolean) => void;
  /** Кнопка выгрузки отчётов (иконка) в строке фильтров. */
  reportExportAction?: {
    onClick: () => void;
    disabled?: boolean;
  };
  /** Кнопка выгрузки сырых ответов. */
  answersExportAction?: {
    onClick: () => void;
    disabled?: boolean;
  };
  /** Переключатель подсветки схожих ответов (рядом с выгрузкой). */
  similarityHighlight?: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    loading?: boolean;
  };
};

const STATUS_OPTIONS: ReadonlyArray<{ value: CandidateSearchStatusFilter; label: string }> = [
  { value: "all", label: "Все статусы" },
  { value: INVITE_STATUS_ACTIVE, label: "Активен" },
  { value: INVITE_STATUS_USED, label: "Пройден" },
  { value: INVITE_STATUS_EXPIRED, label: "Истёк" },
  { value: INVITE_STATUS_REVOKED, label: "Отозван" },
];

const TYPE_OPTIONS: ReadonlyArray<{ value: CandidateSearchTypeFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "screening", label: "Скрининг" },
  { value: "audit", label: ADMIN_EMPLOYEE_ASSESSMENT_LABEL },
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
  reportExportAction,
  answersExportAction,
  similarityHighlight,
}: CandidateSearchPanelProps): React.ReactElement {
  return (
    <div className={`space-y-4 px-5 py-5 ${adminPanelCardClass}`}>
      <div>
        <label htmlFor="candidate-search" className={`block ${stepLabelClass}`}>
          Поиск
        </label>
        <input
          id="candidate-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Код, фамилия, имя, отчество, дата (12.07.1978 / 1978.07.12 / 12 июля 1978), должность"
          className={`${stepInputClass} h-12 text-[16px]`}
        />
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Можно искать по отдельным полям или их сочетаниям: «Иванов Иван», «Иванович», «топ-менеджер»,
          «12 июля 1978».
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        {statusFilter !== undefined && onStatusFilterChange ? (
          <div>
            <span className={`block ${stepLabelClass}`}>Статус приглашения</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onStatusFilterChange(option.value)}
                  className={`rounded-full px-4 py-2 text-[14px] font-bold ${
                    statusFilter === option.value
                      ? "bg-[#00B596] text-white"
                      : "bg-white/70 text-[#5F5E5E]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {typeFilter !== undefined && onTypeFilterChange ? (
          <div>
            <span className={`block ${stepLabelClass}`}>Тип данных</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTypeFilterChange(option.value)}
                  className={`rounded-full px-4 py-2 text-[14px] font-bold ${
                    typeFilter === option.value
                      ? "bg-[#00B596] text-white"
                      : "bg-white/70 text-[#5F5E5E]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {archiveView !== undefined && onArchiveViewChange ? (
          <div>
            <span className={`block ${stepLabelClass}`}>Показать</span>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`text-[14px] font-bold ${
                  !archiveView ? "text-[#007A68]" : "text-[#8C8C8C]"
                }`}
              >
                Активные
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={archiveView}
                aria-label="Переключить архив"
                onClick={() => onArchiveViewChange(!archiveView)}
                className={`relative h-8 w-14 rounded-full transition ${
                  archiveView ? "bg-[#00B596]" : "bg-[#B8B8B8]"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                    archiveView ? "left-7" : "left-1"
                  }`}
                />
              </button>
              <span
                className={`text-[14px] font-bold ${
                  archiveView ? "text-[#007A68]" : "text-[#8C8C8C]"
                }`}
              >
                Архив
              </span>
            </div>
          </div>
        ) : null}

        {reportExportAction || answersExportAction || similarityHighlight ? (
          <div className="ml-auto flex flex-wrap items-end justify-end gap-3 pb-0.5">
            {similarityHighlight ? (
              <div className="flex items-center gap-2">
                <span
                  className={`text-[13px] font-bold leading-tight ${
                    similarityHighlight.enabled ? "text-[#007A68]" : "text-[#8C8C8C]"
                  }`}
                >
                  Схожие ответы
                  {similarityHighlight.loading ? "…" : null}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={similarityHighlight.enabled}
                  aria-label="Подсветка схожих ответов"
                  disabled={similarityHighlight.disabled}
                  onClick={() => similarityHighlight.onChange(!similarityHighlight.enabled)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    similarityHighlight.enabled ? "bg-[#00B596]" : "bg-[#B8B8B8]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                      similarityHighlight.enabled ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            ) : null}
            {answersExportAction ? (
              <button
                type="button"
                title="Выгрузка ответов"
                aria-label="Выгрузка ответов"
                disabled={answersExportAction.disabled}
                onClick={answersExportAction.onClick}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#007A68] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.12)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AnswersExportIcon />
              </button>
            ) : null}
            {reportExportAction ? (
              <button
                type="button"
                title="Выгрузка отчётов"
                aria-label="Выгрузка отчётов"
                disabled={reportExportAction.disabled}
                onClick={reportExportAction.onClick}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#007A68] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.12)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ReportExportIcon />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
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
