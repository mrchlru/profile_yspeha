"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import type { EmployeeFolderFileSummary } from "@/lib/admin/employeeFolderTypes";
import { adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";

export type InterviewCandidateResumePanelProps = {
  candidateFolderKey: string;
  candidateName: string;
};

/**
 * Загрузка резюме кандидата в папке собеседования (PDF, Word).
 */
export function InterviewCandidateResumePanel({
  candidateFolderKey,
  candidateName,
}: InterviewCandidateResumePanelProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ReadonlyArray<EmployeeFolderFileSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/folder-files?folderKey=${encodeURIComponent(candidateFolderKey)}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as { items?: EmployeeFolderFileSummary[] };
      if (res.ok && body.items) {
        const resumeLike = body.items.filter(
          (file) => file.category === "pdf" || file.category === "word"
        );
        setFiles(resumeLike);
      } else {
        setFiles([]);
      }
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [candidateFolderKey]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  async function uploadResume(file: File): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("folderKey", candidateFolderKey);
      formData.set("file", file);
      const res = await fetch("/api/admin/folder-files", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось загрузить резюме.");
        return;
      }
      await loadFiles();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2 border-t border-black/10 pt-3">
      <p className="text-[13px] font-bold text-[#5F5E5E]">Резюме: {candidateName}</p>
      {loading ? (
        <p className={adminPanelMutedTextClass}>Загрузка файлов…</p>
      ) : files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={file.id}>
              <Link
                href={`/admin/results/${encodeURIComponent(candidateFolderKey)}/file/${encodeURIComponent(file.id)}`}
                className="text-[14px] font-medium text-[#007A68] hover:underline"
              >
                {file.fileName}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`text-[13px] ${adminPanelMutedTextClass}`}>Резюме не загружено.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadResume(file);
          }
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Загрузка…" : "Загрузить резюме"}
      </Button>
      {error ? (
        <p className="text-[12px] font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
