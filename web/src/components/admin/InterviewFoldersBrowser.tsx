"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

const MASTER_DETAIL_MIN_CLASS = "min-[1100px]";

/**
 * Список папок раздела «Собеседование» с master-detail на широких экранах.
 */
export function InterviewFoldersBrowser(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKey = searchParams.get("folder")?.trim() ?? "";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [items, setItems] = useState<ReadonlyArray<InterviewFolderSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(initialKey);
  const [wideLayout, setWideLayout] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    function sync(): void {
      setWideLayout(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    if (!wideLayout || selectedKey || items.length === 0) {
      return;
    }
    setSelectedKey(items[0]!.key);
  }, [wideLayout, items, selectedKey]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!wideLayout || !selectedKey) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("folder") === selectedKey) {
      return;
    }
    params.set("folder", selectedKey);
    router.replace(`/admin/interview?${params.toString()}`, { scroll: false });
  }, [selectedKey, wideLayout, router]);

  function selectFolder(key: string): void {
    if (wideLayout) {
      setSelectedKey(key);
      return;
    }
    router.push(`/admin/interview/${encodeURIComponent(key)}`);
  }

  const listBlock = (
    <>
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
            const active = wideLayout && selectedKey === item.key;
            return (
              <li key={item.key}>
                {wideLayout ? (
                  <button
                    type="button"
                    onClick={() => selectFolder(item.key)}
                    className={`flex w-full items-center gap-3 px-4 py-4 text-left transition sm:px-5 ${
                      active
                        ? "bg-[var(--admin-accent-tint-2)]"
                        : "hover:bg-[var(--admin-accent-tint-2)]"
                    }`}
                  >
                    <RowContent title={title} dateLabel={dateLabel} count={item.candidateCount} />
                  </button>
                ) : (
                  <Link
                    href={`/admin/interview/${encodeURIComponent(item.key)}`}
                    className="flex items-center gap-3 px-4 py-4 transition hover:bg-[var(--admin-accent-tint-2)] sm:px-5"
                  >
                    <RowContent title={title} dateLabel={dateLabel} count={item.candidateCount} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );

  if (!wideLayout) {
    return <div className="space-y-5">{listBlock}</div>;
  }

  return (
    <div className={`flex flex-col gap-5 ${MASTER_DETAIL_MIN_CLASS}:flex-row ${MASTER_DETAIL_MIN_CLASS}:items-start`}>
      <div className={`w-full shrink-0 space-y-5 ${MASTER_DETAIL_MIN_CLASS}:max-w-[380px]`}>
        {listBlock}
      </div>
      <div className={`min-w-0 flex-1 ${MASTER_DETAIL_MIN_CLASS}:sticky ${MASTER_DETAIL_MIN_CLASS}:top-6`}>
        {selectedKey ? (
          <InterviewFolderDetailPanel folderKey={selectedKey} embedded />
        ) : (
          <div className={`px-6 py-10 ${adminPanelCardClass}`}>
            <p className={adminPanelMutedTextClass}>Выберите вакансию слева.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RowContent({
  title,
  dateLabel,
  count,
}: {
  title: string;
  dateLabel: string;
  count: number;
}): React.ReactElement {
  return (
    <>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[16px] font-semibold text-[var(--admin-text)]">{title}</h3>
        <p className="mt-0.5 text-[14px] text-[var(--admin-text-3)]">{dateLabel}</p>
      </div>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--admin-text-2)]">
        {String(count)}
      </span>
      <span className="shrink-0 text-[var(--admin-chevron)]" aria-hidden>
        ›
      </span>
    </>
  );
}
