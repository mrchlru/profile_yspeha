"use client";

import Link from "next/link";
import React, { useState } from "react";

import {
  AdminIconButton,
  ArchiveToIcon,
  DeleteFolderIcon,
  OpenFolderIcon,
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
  const folderHref = `/admin/results/${encodeURIComponent(item.key)}`;

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
    <div
      className="relative z-10 flex shrink-0 items-center gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Link
        href={folderHref}
        title="Открыть папку"
        aria-label={`Открыть папку ${item.displayName}`}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#5F5E5E] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.12)] transition hover:bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <OpenFolderIcon />
      </Link>
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
