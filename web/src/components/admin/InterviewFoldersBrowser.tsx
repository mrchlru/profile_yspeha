"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { InterviewFolderSummary } from "@/lib/admin/interviewFolderTypes";
import { CandidateSearchPanel } from "@/components/admin/CandidateSearchPanel";
import { formatIsoCalendarDateRu } from "@/lib/datetime/moscowTime";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
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

      <div className={`overflow-hidden ${adminPanelCardClass}`}>
        <ul className="divide-y divide-[var(--admin-hairline)]">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={`/admin/interview/${encodeURIComponent(item.key)}`}
                className="flex flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-[var(--admin-accent-tint-2)] sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-semibold text-[var(--admin-text)]">
                    {item.displayName}
                  </h3>
                  <p className={`mt-0.5 ${adminPanelMutedTextClass}`}>
                    Первый скрининг: {formatIsoCalendarDateRu(item.firstScreeningAt)}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--admin-surface-muted)] px-3 py-1 text-[13px] font-semibold text-[var(--admin-text-2)]">
                  {String(item.candidateCount)} канд.
                </span>
                <span className="text-[var(--admin-chevron)]" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
