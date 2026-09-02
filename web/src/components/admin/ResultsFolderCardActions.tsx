"use client";

import React, { useState } from "react";

import {
  AdminIconButton,
  ArchiveToIcon,
  DeleteFolderIcon,
  RestoreFromArchiveIcon,
} from "@/components/admin/AdminIconButton";
import type { EmployeeFolderSummary } from "@/lib/admin/employeeFolderTypes";

export type ResultsFolderCardActionsProps = {
  item: EmployeeFolderSummary;
  archiveView: boolean;
  isFullAdmin: boolean;
  busyDelete: boolean;
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
  onDelete: () => Promise<void>;
};

/**
 * Иконки действий на карточке папки в разделе «Результаты».
 */
export function ResultsFolderCardActions({
  item,
  archiveView,
  isFullAdmin,
  busyDelete,
  onArchive,
  onRestore,
  onDelete,
}: ResultsFolderCardActionsProps): React.ReactElement {
  const [busyLifecycle, setBusyLifecycle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = busyDelete || busyLifecycle;

  async function runLifecycle(action: () => Promise<void>): Promise<void> {
    setBusyLifecycle(true);
    setError(null);
    try {
      await action();
    } catch {
      setError("Не удалось выполнить действие.");
    } finally {
      setBusyLifecycle(false);
    }
  }

  const showArchive = !archiveView && !item.isArchived;
  const showRestore = archiveView && item.isArchived;
  const showDelete = isFullAdmin;

  return (
    <div className="flex shrink-0 items-center gap-2">
      {showArchive ? (
        <AdminIconButton
          label="Отправить в архив"
          disabled={busy}
          onClick={() => void runLifecycle(onArchive)}
        >
          <ArchiveToIcon />
        </AdminIconButton>
      ) : null}
      {showRestore ? (
        <AdminIconButton
          label="Вернуть из архива"
          disabled={busy}
          onClick={() => void runLifecycle(onRestore)}
        >
          <RestoreFromArchiveIcon />
        </AdminIconButton>
      ) : null}
      {showDelete ? (
        <AdminIconButton
          label="Удалить папку"
          tone="danger"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          <DeleteFolderIcon />
        </AdminIconButton>
      ) : null}
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
