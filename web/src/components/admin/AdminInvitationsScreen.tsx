"use client";

import React, { useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { InvitationsTable } from "@/components/admin/InvitationsTable";
import { ResultsExportIconButton } from "@/components/admin/CandidateSearchPanel";

/**
 * Экран «Приглашения» с кнопкой обновления в шапке.
 */
export function AdminInvitationsScreen(): React.ReactElement {
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(false);

  return (
    <AdminShell
      title="Приглашения"
      headerActions={
        <ResultsExportIconButton
          title="Обновить"
          ariaLabel="Обновить список"
          disabled={loading}
          onClick={() => setRefreshToken((value) => value + 1)}
        >
          <RefreshIcon />
        </ResultsExportIconButton>
      }
    >
      <InvitationsTable
        refreshToken={refreshToken}
        onLoadingChange={setLoading}
      />
    </AdminShell>
  );
}

function RefreshIcon(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
