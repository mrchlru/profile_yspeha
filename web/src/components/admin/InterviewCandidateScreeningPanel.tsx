"use client";

import Link from "next/link";
import React from "react";

import type { InterviewFolderScreeningReportSession } from "@/lib/admin/candidateFolderTypes";
import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import {
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";

export type InterviewCandidateScreeningPanelProps = {
  candidateFolderKey: string;
  hasScreening: boolean;
  pendingInvite: boolean;
  screeningSessions: number;
  screeningReportSessions: ReadonlyArray<InterviewFolderScreeningReportSession>;
};

/**
 * Блок просмотра результатов скрининга в карточке кандидата (раздел «Собеседование»).
 */
export function InterviewCandidateScreeningPanel({
  candidateFolderKey,
  hasScreening,
  pendingInvite,
  screeningSessions,
  screeningReportSessions,
}: InterviewCandidateScreeningPanelProps): React.ReactElement {
  const statusLabel = pendingInvite
    ? "ожидает прохождения"
    : hasScreening
      ? `${String(screeningSessions)} сессий`
      : "нет";

  return (
    <div className="space-y-3 rounded-2xl border border-black/8 bg-white/60 px-4 py-4">
      <div>
        <h4 className={adminPanelSectionTitleClass}>Скрининг</h4>
        <p className={`mt-1 ${adminPanelMutedTextClass}`}>Статус: {statusLabel}</p>
      </div>

      {screeningReportSessions.length > 0 ? (
        <ul className="space-y-3">
          {screeningReportSessions.map((session) => (
            <li
              key={session.sessionId}
              className="space-y-2 rounded-2xl border border-black/8 bg-white/80 px-4 py-3"
            >
              <p className="text-[14px] font-bold text-[#5F5E5E]">{session.label}</p>
              <div className="flex flex-wrap gap-2">
                <ReportLink
                  folderKey={candidateFolderKey}
                  documentId="short_report"
                  sessionId={session.sessionId}
                  label="Короткий отчёт"
                />
                <ReportLink
                  folderKey={candidateFolderKey}
                  documentId="full_report"
                  sessionId={session.sessionId}
                  label="Объёмный отчёт"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : hasScreening && !pendingInvite ? (
        <p className={`text-[13px] ${adminPanelMutedTextClass}`}>
          Отчёт ещё формируется или данные сессии неполные.
        </p>
      ) : null}

      {hasScreening && !pendingInvite ? (
        <Link
          href={`/admin/results/${encodeURIComponent(candidateFolderKey)}`}
          className="inline-flex rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E] transition hover:bg-[#d0d0d0]"
        >
          Вся папка кандидата
        </Link>
      ) : null}
    </div>
  );
}

function ReportLink({
  folderKey,
  documentId,
  sessionId,
  label,
}: {
  folderKey: string;
  documentId: EmployeeDocumentSlotId;
  sessionId: string;
  label: string;
}): React.ReactElement {
  const query = new URLSearchParams({ sessionId });
  const href = `/admin/results/${encodeURIComponent(folderKey)}/report/${encodeURIComponent(documentId)}?${query.toString()}`;

  return (
    <Link
      href={href}
      className="inline-flex rounded-full bg-[#00B596] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[#009f84]"
    >
      {label}
    </Link>
  );
}
