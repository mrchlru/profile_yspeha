"use client";

import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { ResultsBrowser, type ResultsHeaderExportHandlers } from "@/components/admin/ResultsBrowser";
import { ResultsExportIconButton } from "@/components/admin/CandidateSearchPanel";

/**
 * Экран «Результаты» с иконками экспорта в шапке (макет 4.2).
 */
export function AdminResultsScreen(): React.ReactElement {
  const [headerExports, setHeaderExports] = React.useState<ResultsHeaderExportHandlers | null>(
    null
  );

  const headerActions =
    headerExports !== null ? (
      <>
        <ResultsExportIconButton
          title="Экспорт таблицей"
          ariaLabel="Экспорт таблицей"
          disabled={headerExports.exportDisabled}
          onClick={headerExports.onAnswersExport}
        >
          <AnswersExportIcon />
        </ResultsExportIconButton>
        <ResultsExportIconButton
          title="Скачать отчёты"
          ariaLabel="Скачать отчёты"
          disabled={headerExports.exportDisabled}
          onClick={headerExports.onReportExport}
        >
          <ReportExportIcon />
        </ResultsExportIconButton>
      </>
    ) : null;

  return (
    <AdminShell
      title="Результаты тестирования"
      description="Папки сотрудников, отчёты и дашборды"
      headerActions={headerActions}
    >
      <ResultsBrowser
        hideExportActions
        onRegisterHeaderExports={setHeaderExports}
      />
    </AdminShell>
  );
}

function AnswersExportIcon(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </svg>
  );
}

function ReportExportIcon(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12m-5-2 5 5 5-5M5 21h14M9 17h6" />
    </svg>
  );
}
