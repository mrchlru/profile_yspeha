"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import type { CommissionCandidateEvalStatus } from "@/lib/commission/commissionEvalSheets";
import { adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";

export type InterviewCommissionEvalPanelProps = {
  interviewFolderKey: string;
  candidateFolderKey: string;
  candidateName: string;
  /** Увеличивается при изменении состава комиссии — перезагружает статус. */
  refreshToken?: number;
};

/**
 * Отправка анкет комиссии и статус «Заключение комиссии» по кандидату.
 */
export function InterviewCommissionEvalPanel({
  interviewFolderKey,
  candidateFolderKey,
  candidateName,
  refreshToken = 0,
}: InterviewCommissionEvalPanelProps): React.ReactElement | null {
  const [status, setStatus] = useState<CommissionCandidateEvalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/commission-eval/status?interviewFolderKey=${encodeURIComponent(interviewFolderKey)}&candidateFolderKey=${encodeURIComponent(candidateFolderKey)}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as { status?: CommissionCandidateEvalStatus; error?: string };
      if (res.ok && body.status) {
        setStatus(body.status);
        setError(null);
      } else {
        setStatus(null);
        setError(body.error ?? "Не удалось загрузить статус.");
      }
    } catch {
      setStatus(null);
      setError("Сеть недоступна.");
    } finally {
      setLoading(false);
    }
  }, [interviewFolderKey, candidateFolderKey]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, refreshToken]);

  async function dispatchSheets(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/commission-eval/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewFolderKey,
          candidateFolderKey,
          candidateName,
          resendEmails: Boolean(status && status.sheetsCreated > 0),
        }),
      });
      const body = (await res.json()) as { status?: CommissionCandidateEvalStatus; error?: string };
      if (!res.ok || !body.status) {
        setError(body.error ?? "Не удалось отправить анкеты.");
        return;
      }
      setStatus(body.status);
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Статус комиссии…</p>;
  }

  if (!status || status.totalMembers === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[24px] border border-black/8 bg-[#F7F7F7] px-4 py-4">
      <p className="text-[14px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
        Оценочные листы комиссии
      </p>
      {status ? (
        <p className={adminPanelMutedTextClass}>
          Отправлено анкет: {status.emailsSent} из {status.totalMembers}. Заполнено:{" "}
          {status.submittedCount} из {status.totalMembers}.
        </p>
      ) : null}
      {error ? <p className="text-sm font-medium text-red-700/90">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void dispatchSheets()}>
          {status && status.sheetsCreated > 0 ? "Повторно отправить письма" : "Отправить анкеты комиссии"}
        </Button>
        {status?.conclusionReady && status.conclusionViewUrl ? (
          <Link
            href={status.conclusionViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-[#5F5E5E] shadow-sm hover:bg-white/90"
          >
            Заключение комиссии
          </Link>
        ) : status && status.totalMembers > 0 ? (
          <span className={`inline-flex items-center px-2 text-sm ${adminPanelMutedTextClass}`}>
            Заключение появится после отправки всех анкет
          </span>
        ) : null}
      </div>
    </div>
  );
}
