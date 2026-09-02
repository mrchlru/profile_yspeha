"use client";

import Link from "next/link";
import React, { useRef, useState } from "react";

import { Button } from "@/components/Button";
import type { EmployeeFolderFileSummary } from "@/lib/admin/employeeFolderTypes";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { FOLDER_FILE_POLICIES } from "@/lib/admin/folderFilePolicy";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { stepLabelClass } from "@/lib/stepPageTheme";

export type EmployeeFolderFilesPanelProps = {
  folderKey: string;
  files: ReadonlyArray<EmployeeFolderFileSummary>;
  isFullAdmin: boolean;
  onChanged: () => Promise<void>;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} Б`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/**
 * Загрузка и просмотр файлов в папке сотрудника.
 */
export function EmployeeFolderFilesPanel({
  folderKey,
  files,
  isFullAdmin,
  onChanged,
}: EmployeeFolderFilesPanelProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptExtensions = FOLDER_FILE_POLICIES.flatMap((entry) => entry.extensions).join(",");

  async function uploadFile(file: File): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("folderKey", folderKey);
      formData.set("file", file);
      const res = await fetch("/api/admin/folder-files", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось загрузить файл.");
        return;
      }
      await onChanged();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function deleteFile(file: EmployeeFolderFileSummary): Promise<void> {
    if (!window.confirm(`Удалить файл «${file.fileName}»?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ folderKey });
      const res = await fetch(`/api/admin/folder-files/${file.id}?${params.toString()}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось удалить файл.");
        return;
      }
      await onChanged();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
      <div>
        <h3 className={adminPanelSectionTitleClass}>Файлы в папке</h3>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Word, Excel, PowerPoint, PDF, изображения и видео. Видео — до 100 МБ, остальные — до 25 МБ,
          изображения — до 15 МБ.
        </p>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptExtensions}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadFile(file);
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Загрузка…" : "Загрузить файл"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {files.length === 0 ? (
        <p className={adminPanelMutedTextClass}>Загруженных файлов пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[#5F5E5E]">{file.fileName}</p>
                <p className={`text-[13px] ${adminPanelMutedTextClass}`}>
                  {file.categoryLabel} · {formatFileSize(file.sizeBytes)} ·{" "}
                  {formatMoscowDateTime(file.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/results/${encodeURIComponent(folderKey)}/file/${encodeURIComponent(file.id)}`}
                  className="inline-flex rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E] transition hover:bg-[#d0d0d0]"
                >
                  Открыть
                </Link>
                {isFullAdmin ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void deleteFile(file)}
                  >
                    Удалить
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={`${stepLabelClass} !text-[12px] !font-medium`}>
        Загруженные файлы хранятся в папке сотрудника и доступны администратору и HrD.
      </p>
    </div>
  );
}
