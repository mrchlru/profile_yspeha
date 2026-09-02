"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { InterviewFolderSummary } from "@/lib/admin/interviewFolderTypes";
import { CandidateSearchPanel } from "@/components/admin/CandidateSearchPanel";
import { formatIsoCalendarDateRu } from "@/lib/datetime/moscowTime";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * Список папок раздела «Собеседование».
 */
export function InterviewFoldersBrowser(): React.ReactElement {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [items, setItems] = useState<ReadonlyArray<InterviewFolderSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
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
        setError(body.error ?? "Не удалось загрузить папки.");
        setItems([]);
        return;
      }
      setItems(body.items);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return (
    <div className="space-y-5">
      <CandidateSearchPanel query={query} onQueryChange={setQuery} />

      {loading ? <p className={adminPanelMutedTextClass}>Загрузка папок…</p> : null}
      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className={`px-6 py-6 ${adminPanelCardClass}`}>
          <p className={adminPanelMutedTextClass}>
            Папок пока нет. Они появятся после создания первого скрининга с указанием должности в
            разделе «Создать тестирование».
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={`/admin/interview/${encodeURIComponent(item.key)}`}
            className={`block px-5 py-5 transition hover:opacity-90 ${adminPanelCardClass}`}
          >
            <h3 className={adminPanelSectionTitleClass}>{item.displayName}</h3>
            <p className={`mt-2 ${adminPanelMutedTextClass}`}>
              Должность: {item.positionTitle}
            </p>
            <p className={`mt-1 ${adminPanelMutedTextClass}`}>
              Первый скрининг: {formatIsoCalendarDateRu(item.firstScreeningAt)}
            </p>
            <p className={`mt-3 text-[14px] font-bold text-[#007A68]`}>
              Скринингов в папке: {String(item.screeningCount)}
            </p>
            <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>
              Кандидатов: {String(item.candidateCount)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
