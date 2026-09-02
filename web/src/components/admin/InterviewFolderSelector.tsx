"use client";

import React, { useEffect, useState } from "react";

import type { InterviewFolderSummary } from "@/lib/admin/interviewFolderTypes";
import { adminPanelCardClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { stepInputClass, stepLabelClass } from "@/lib/stepPageTheme";

export type InterviewFolderMode = "new" | "existing";

export type InterviewFolderSelection = {
  mode: InterviewFolderMode;
  existingFolderKey: string | null;
  selectedDisplayName: string | null;
  positionTitle: string;
};

export const EMPTY_INTERVIEW_FOLDER_SELECTION: InterviewFolderSelection = {
  mode: "new",
  existingFolderKey: null,
  selectedDisplayName: null,
  positionTitle: "",
};

export type InterviewFolderSelectorProps = {
  value: InterviewFolderSelection;
  onChange: (value: InterviewFolderSelection) => void;
};

/**
 * Выбор папки вакансии в разделе «Собеседование» или создание новой по должности.
 */
export function InterviewFolderSelector({
  value,
  onChange,
}: InterviewFolderSelectorProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [folders, setFolders] = useState<ReadonlyArray<InterviewFolderSummary>>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (value.mode !== "existing") {
      return;
    }

    async function loadFolders(): Promise<void> {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery.trim()) {
          params.set("q", debouncedQuery.trim());
        }
        const res = await fetch(`/api/admin/interview-folders?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as { items?: InterviewFolderSummary[]; error?: string };
        if (!res.ok || !body.items) {
          setLoadError(body.error ?? "Не удалось загрузить папки собеседования.");
          setFolders([]);
          return;
        }
        setFolders(body.items);
      } catch {
        setLoadError("Сеть недоступна. Попробуйте ещё раз.");
        setFolders([]);
      } finally {
        setLoading(false);
      }
    }

    void loadFolders();
  }, [debouncedQuery, value.mode]);

  return (
    <div className={`space-y-4 px-5 py-5 ${adminPanelCardClass}`}>
      <div>
        <p className="text-[15px] font-extrabold text-[#5F5E5E]">Папка в разделе «Собеседование»</p>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Название папки = должность и дата первого скрининга по этой вакансии. Для повторного
          скрининга на ту же вакансию выберите существующую папку.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              mode: "new",
              existingFolderKey: null,
              selectedDisplayName: null,
            })
          }
          className={`rounded-full px-4 py-2 text-[14px] font-bold ${
            value.mode === "new" ? "bg-[#00B596] text-white" : "bg-white/70 text-[#5F5E5E]"
          }`}
        >
          Новая вакансия
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              mode: "existing",
              positionTitle: "",
            })
          }
          className={`rounded-full px-4 py-2 text-[14px] font-bold ${
            value.mode === "existing" ? "bg-[#00B596] text-white" : "bg-white/70 text-[#5F5E5E]"
          }`}
        >
          Выбрать из «Собеседование»
        </button>
      </div>

      {value.mode === "new" ? (
        <div>
          <label htmlFor="interview-position-title" className={`block ${stepLabelClass}`}>
            Должность (название вакансии)
          </label>
          <input
            id="interview-position-title"
            type="text"
            value={value.positionTitle}
            onChange={(event) =>
              onChange({
                ...value,
                positionTitle: event.target.value,
              })
            }
            placeholder="Например: Менеджер по продажам"
            className={`${stepInputClass} mt-2 h-12 text-[16px]`}
          />
          <p className={`mt-2 text-[13px] ${adminPanelMutedTextClass}`}>
            Дата первого скрининга по этой должности будет добавлена к названию папки автоматически.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по должности или дате"
            className={`${stepInputClass} h-12 text-[16px]`}
          />
          {loading ? <p className={adminPanelMutedTextClass}>Загрузка папок…</p> : null}
          {loadError ? (
            <p className="text-sm font-medium text-red-700/90" role="alert">
              {loadError}
            </p>
          ) : null}
          {!loading && !loadError && folders.length === 0 ? (
            <p className={adminPanelMutedTextClass}>
              Папок пока нет. Создайте первый скрининг с новой должностью.
            </p>
          ) : null}
          <ul className="max-h-[280px] space-y-2 overflow-y-auto">
            {folders.map((folder) => {
              const selected = value.existingFolderKey === folder.key;
              return (
                <li key={folder.key}>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        existingFolderKey: folder.key,
                        selectedDisplayName: folder.displayName,
                      })
                    }
                    className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                      selected ? "bg-[#00B596]/15 ring-2 ring-[#00B596]/40" : "bg-white/60 hover:bg-white/80"
                    }`}
                  >
                    <p className="font-bold text-[#5F5E5E]">{folder.displayName}</p>
                    <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>
                      Скринингов: {String(folder.screeningCount)} · кандидатов:{" "}
                      {String(folder.candidateCount)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Проверяет, что выбрана или новая должность, или существующая папка.
 */
export function isInterviewFolderSelectionReady(value: InterviewFolderSelection): boolean {
  if (value.mode === "existing") {
    return Boolean(value.existingFolderKey);
  }
  return value.positionTitle.trim().length > 0;
}
