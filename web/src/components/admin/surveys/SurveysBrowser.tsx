"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  surveyCardClass,
  surveyChipAnonClass,
  surveyChipDraftClass,
  surveyChipPublishedClass,
  surveyChipSurveyClass,
  surveyChipTestClass,
  surveyMutedTextClass,
  surveyOutlineButtonClass,
  surveyPrimaryButtonClass,
  surveySearchInputClass,
  surveySegmentActiveClass,
  surveySegmentIdleClass,
  surveySegmentTrackClass,
  surveySelectClass,
  surveyTintButtonClass,
} from "@/lib/survey/surveyConstructorTheme";
import type { SurveyListItem, SurveyMode, SurveyStatus } from "@/lib/survey/surveyTypes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: "Черновик",
  published: "Опубликован",
  archived: "Архив",
};

const MODE_LABELS: Record<SurveyMode, string> = {
  survey: "Опрос",
  test: "Тест",
};

const STARTER_TEMPLATES: Array<{ title: string; sub: string; color: string; disabled?: boolean }> =
  [
    { title: "Пустой опрос", sub: "Без оценки ответов", color: "#DDF1EC" },
    { title: "Пустой тест", sub: "С баллами и ключом", color: "#FFF1D6" },
    {
      title: "Пульс-опрос команды",
      sub: "Шаблон · скоро",
      color: "#EEF0FB",
      disabled: true,
    },
    { title: "Exit-интервью", sub: "Шаблон · скоро", color: "#F4E8F7", disabled: true },
    { title: "Аудит нагрузки", sub: "Шаблон · скоро", color: "#FDE8E8", disabled: true },
  ];

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const dayMs = 86400000;
  if (diffMs < dayMs) {
    return "сегодня";
  }
  if (diffMs < dayMs * 2) {
    return "вчера";
  }
  if (diffMs < dayMs * 8) {
    return `${String(Math.floor(diffMs / dayMs))} дн. назад`;
  }
  return date.toLocaleDateString("ru-RU");
}

/**
 * Список собственных опросов (макет «Опросы — список»).
 */
export function SurveysBrowser(): React.ReactElement {
  const [items, setItems] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | "all">("all");
  const [modeFilter, setModeFilter] = useState<SurveyMode | "all">("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (modeFilter !== "all") {
        params.set("mode", modeFilter);
      }
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      const res = await fetch(`/api/admin/surveys?${params.toString()}`);
      const body = (await res.json()) as { items?: SurveyListItem[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось загрузить опросы");
        setItems([]);
        return;
      }
      setItems(body.items ?? []);
    } catch {
      setError("Сеть недоступна");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, modeFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function createSurvey(mode: SurveyMode): Promise<void> {
    setError(null);
    try {
      const res = await fetch("/api/admin/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = (await res.json()) as { surveyId?: string; error?: string };
      if (!res.ok || !body.surveyId) {
        setError(body.error ?? "Не удалось создать опрос");
        return;
      }
      window.location.href = `/admin/surveys/${encodeURIComponent(body.surveyId)}`;
    } catch {
      setError("Сеть недоступна");
    }
  }

  async function duplicateSurvey(id: string): Promise<void> {
    setBusyId(id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}/duplicate`, {
        method: "POST",
      });
      const body = (await res.json()) as { surveyId?: string; error?: string };
      if (!res.ok || !body.surveyId) {
        setError(body.error ?? "Не удалось дублировать");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function archiveSurvey(id: string): Promise<void> {
    setBusyId(id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}/archive`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Не удалось отправить в архив");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function onStarterClick(index: number): void {
    if (index === 0) {
      void createSurvey("survey");
      return;
    }
    if (index === 1) {
      void createSurvey("test");
    }
  }

  return (
    <div className="-mx-2 flex flex-col gap-7 sm:-mx-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.02em] text-[#1D1D1F]">
            Опросы
          </h1>
          <p className={`mt-1.5 text-[15px] ${surveyMutedTextClass}`}>
            Собственные опросы и тесты компании. Встроенные методики остаются во вкладке «Создать
            тестирование».
          </p>
        </div>
        <button
          type="button"
          className={surveyPrimaryButtonClass}
          onClick={() => void createSurvey("survey")}
        >
          <PlusIcon />
          Создать
        </button>
      </div>

      <section aria-labelledby="survey-start" className="flex flex-col gap-3">
        <h2 id="survey-start" className={`m-0 text-[14px] font-bold ${surveyMutedTextClass}`}>
          Начать с
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
          {STARTER_TEMPLATES.map((starter, index) => (
            <button
              key={starter.title}
              type="button"
              disabled={starter.disabled}
              className="flex flex-col overflow-hidden rounded-[14px] border border-[#E5E5E5] bg-white text-left text-[#1D1D1F] transition hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-55"
              onClick={() => onStarterClick(index)}
            >
              <div
                className="flex h-24 items-center justify-center"
                style={{ background: starter.color }}
              >
                <div className="flex w-[70%] flex-col gap-1.5 rounded-md bg-white p-2.5 shadow-sm">
                  <span className="h-1.5 w-[60%] rounded-sm bg-[#C5D4CF]" />
                  <span className="h-1 w-[90%] rounded-sm bg-[#E5E5E5]" />
                  <span className="h-1 w-3/4 rounded-sm bg-[#E5E5E5]" />
                </div>
              </div>
              <div className="px-3.5 py-3">
                <div className="text-[14px] font-bold">{starter.title}</div>
                <div className={`mt-0.5 text-[12px] ${surveyMutedTextClass}`}>{starter.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="survey-mine" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="survey-mine" className="m-0 text-[20px] font-extrabold text-[#1D1D1F]">
            Мои опросы и тесты
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              id="survey-q"
              type="search"
              placeholder="Поиск по названию"
              className={surveySearchInputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div role="group" aria-label="Тип" className={surveySegmentTrackClass}>
              {(
                [
                  ["all", "Все"],
                  ["survey", "Опросы"],
                  ["test", "Тесты"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={modeFilter === value}
                  className={modeFilter === value ? surveySegmentActiveClass : surveySegmentIdleClass}
                  onClick={() => setModeFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              id="survey-st"
              className={surveySelectClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SurveyStatus | "all")}
              aria-label="Статус"
            >
              <option value="all">Все статусы</option>
              <option value="published">Опубликован</option>
              <option value="draft">Черновик</option>
              <option value="archived">Архив</option>
            </select>
          </div>
        </div>

        {error ? <p className="text-[14px] font-semibold text-red-700">{error}</p> : null}

        {loading ? (
          <p className={surveyMutedTextClass}>Загрузка…</p>
        ) : items.length === 0 ? (
          <p className={surveyMutedTextClass}>Опросов пока нет. Создайте первый.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {items.map((item) => (
              <article key={item.id} className={surveyCardClass}>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      item.mode === "test" ? surveyChipTestClass : surveyChipSurveyClass
                    }
                  >
                    {MODE_LABELS[item.mode]}
                  </span>
                  <span
                    className={
                      item.status === "published"
                        ? surveyChipPublishedClass
                        : surveyChipDraftClass
                    }
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                  {item.anonymous ? <span className={surveyChipAnonClass}>Анонимный</span> : null}
                  <span className={`ml-auto text-[12px] ${surveyMutedTextClass}`}>
                    {item.versionLabel}
                  </span>
                </div>

                <Link
                  href={`/admin/surveys/${encodeURIComponent(item.id)}`}
                  className="text-[17px] font-extrabold leading-snug text-[#1D1D1F] no-underline hover:text-[#007A68]"
                >
                  {item.title}
                </Link>

                <div className="grid grid-cols-3 gap-2 border-y border-[#F0F0F0] py-3">
                  <div>
                    <div className="text-[18px] font-extrabold">{String(item.questionCount)}</div>
                    <div className={`text-[12px] ${surveyMutedTextClass}`}>вопросов</div>
                  </div>
                  <div>
                    <div className="text-[18px] font-extrabold">
                      {item.status === "draft" && item.responseCount === 0
                        ? "—"
                        : String(item.responseCount)}
                    </div>
                    <div className={`text-[12px] ${surveyMutedTextClass}`}>ответов</div>
                  </div>
                  <div>
                    <div
                      className={`text-[18px] font-extrabold ${
                        item.pendingReviewCount > 0 ? "text-[#B54708]" : "text-[#1D1D1F]"
                      }`}
                    >
                      {item.status === "draft" ? "—" : String(item.pendingReviewCount)}
                    </div>
                    <div className={`text-[12px] ${surveyMutedTextClass}`}>ждут проверки</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`flex-1 text-[12px] ${surveyMutedTextClass}`}>
                    Изменён {formatUpdatedAt(item.updatedAt)}
                  </span>
                  {item.status === "published" ? (
                    <Link
                      href={`/admin/create-test?surveyId=${encodeURIComponent(item.id)}`}
                      className={surveyTintButtonClass}
                    >
                      Выдать
                    </Link>
                  ) : null}
                  {item.responseCount > 0 ? (
                    <Link
                      href={`/admin/results/surveys/${encodeURIComponent(item.id)}`}
                      className={surveyOutlineButtonClass}
                    >
                      Результаты
                    </Link>
                  ) : null}
                  <div className="relative" ref={menuOpenId === item.id ? menuRef : undefined}>
                    <button
                      type="button"
                      aria-label="Ещё: дублировать, архивировать"
                      disabled={busyId === item.id}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === item.id ? null : item.id);
                      }}
                    >
                      <DotsIcon />
                    </button>
                    {menuOpenId === item.id ? (
                      <div className="absolute bottom-full right-0 z-10 mb-1 min-w-[160px] rounded-xl border border-[#E5E5E5] bg-white py-1 shadow-lg">
                        <Link
                          href={`/admin/surveys/${encodeURIComponent(item.id)}`}
                          className="block px-4 py-2 text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F5]"
                        >
                          Открыть
                        </Link>
                        <button
                          type="button"
                          className="block w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F5]"
                          onClick={() => void duplicateSurvey(item.id)}
                        >
                          Дублировать
                        </button>
                        {item.status !== "archived" ? (
                          <button
                            type="button"
                            className="block w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F5]"
                            onClick={() => void archiveSurvey(item.id)}
                          >
                            В архив
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlusIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5F5E5E" aria-hidden>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
