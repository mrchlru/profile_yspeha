"use client";

import React, { useState } from "react";

import { Button } from "@/components/Button";
import type { CandidateLifecycleStatus } from "@/lib/admin/candidateFolderTypes";

export type CandidateLifecycleButtonsProps = {
  folderKey: string;
  lifecycleStatus: CandidateLifecycleStatus | null;
  context: "results" | "interview";
  onChanged: () => Promise<void>;
  disabled?: boolean;
};

/**
 * Кнопки смены жизненного цикла папки кандидата.
 */
export function CandidateLifecycleButtons({
  folderKey,
  lifecycleStatus,
  context,
  onChanged,
  disabled = false,
}: CandidateLifecycleButtonsProps): React.ReactElement | null {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!folderKey.startsWith("candidate:")) {
    return null;
  }

  async function runAction(action: "hire" | "archive" | "restore"): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/candidate-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderKey, action }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось выполнить действие.");
        return;
      }
      await onChanged();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const showHire = context === "interview" && lifecycleStatus === "interview";
  const showArchiveFromInterview = context === "interview" && lifecycleStatus === "interview";
  const showArchiveFromResults = context === "results" && lifecycleStatus === "active";
  const showRestore = context === "results" && lifecycleStatus === "archived";

  if (!showHire && !showArchiveFromInterview && !showArchiveFromResults && !showRestore) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {showHire ? (
          <Button
            type="button"
            disabled={disabled || busy}
            onClick={() => void runAction("hire")}
          >
            {busy ? "…" : "Принят на работу"}
          </Button>
        ) : null}
        {showArchiveFromInterview || showArchiveFromResults ? (
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || busy}
            onClick={() => void runAction("archive")}
          >
            {busy ? "…" : "Отправить в архив"}
          </Button>
        ) : null}
        {showRestore ? (
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || busy}
            onClick={() => void runAction("restore")}
          >
            {busy ? "…" : "Вернуть из архива"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
