"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InterviewFolderDetailPanel } from "@/components/admin/InterviewFolderDetailPanel";
import type { InterviewFolderSummary } from "@/lib/admin/interviewFolderTypes";
import { CandidateSearchPanel } from "@/components/admin/CandidateSearchPanel";
import { splitInterviewFolderDisplayName } from "@/lib/admin/interviewCandidateUi";
import { formatIsoCalendarDateRu } from "@/lib/datetime/moscowTime";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
} from "@/lib/admin/adminPanelTheme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * Список вакансий: клик открывает папку сразу под списком.
 */
export function InterviewFoldersBrowser(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailRef = useRef<HTMLDivElement>(null);
  const initialKey = searchParams.get("folder")?.trim() ?? "";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [items, setItems] = useState<ReadonlyArray<InterviewFolderSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(initialKey);

  useEffect(() => {
    const fromUrl = searchParams.get("folder")?.trim() ?? "";
    if (fromUrl) {
      setSelectedKey(fromUrl);
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (!selectedKey) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("folder") !== selectedKey) {
      params.set("folder", selectedKey);
      router.replace(`/admin/interview?${params.toString()}`, { scroll: false });
    }
  }, [selectedKey, router]);

  useEffect(() => {
    if (!selectedKey || !detailRef.current) {
      return;
    }
    detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedKey]);

  function selectFolder(key: string): void {
    setSelectedKey(key);
  }

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
        <p className="border-b border-[var(--admin-hairline)] px-4 py-2 text-[13px] font-medium text-[var(--admin-text-3)] sm:px-5">
          Вакансии · кандидаты
        </p>
        <ul className="divide-y divide-[var(--admin-hairline)]">
          {items.map((item) => {
            const { title, datePart } = splitInterviewFolderDisplayName(item.displayName);
            const dateLabel = datePart ?? formatIsoCalendarDateRu(item.firstScreeningAt);
            const active = selectedKey === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => selectFolder(item.key)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-center gap-3 px-4 py-4 text-left transition sm:px-5 ${
                    active
                      ? "bg-[var(--admin-accent-tint-2)] ring-1 ring-inset ring-[var(--admin-accent)]/25"
                      : "hover:bg-[var(--admin-accent-tint-2)]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[16px] font-semibold text-[var(--admin-text)]">
                      {title}
                    </h3>
                    <p className="mt-0.5 text-[14px] text-[var(--admin-text-3)]">{dateLabel}</p>
                  </div>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--admin-text-2)]">
                    {String(item.candidateCount)}
                  </span>
                  <span className="shrink-0 text-[var(--admin-chevron)]" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedKey ? (
        <div ref={detailRef} className="scroll-mt-6">
          <InterviewFolderDetailPanel folderKey={selectedKey} embedded />
        </div>
      ) : items.length > 0 && !loading ? (
        <div className={`px-6 py-8 ${adminPanelCardClass}`}>
          <p className={adminPanelMutedTextClass}>Выберите вакансию в списке выше.</p>
        </div>
      ) : null}
    </div>
  );
}
