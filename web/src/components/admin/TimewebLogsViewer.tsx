"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { adminPanelCardClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import type {
  TimewebDeploySummary,
  TimewebLogEntry,
  TimewebLogKind,
  TimewebLogSource,
} from "@/lib/timeweb/timewebLogsTypes";

const POLL_MS = 4000;

const TIME_RANGE_OPTIONS = [
  { id: "15m", label: "Last 15 min", ms: 15 * 60 * 1000 },
  { id: "1h", label: "Last 1 hour", ms: 60 * 60 * 1000 },
  { id: "6h", label: "Last 6 hours", ms: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All time", ms: 0 },
] as const;

type HistogramBucket = {
  key: string;
  height: number;
  hasError: boolean;
};

/**
 * Просмотр runtime/deploy логов Timeweb Cloud в админ-панели.
 */
export function TimewebLogsViewer(): React.ReactElement {
  const [configured, setConfigured] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [sources, setSources] = useState<TimewebLogSource[]>([]);
  const [sourceId, setSourceId] = useState("profile");
  const [kind, setKind] = useState<TimewebLogKind>("runtime");
  const [deployId, setDeployId] = useState("");
  const [deploys, setDeploys] = useState<TimewebDeploySummary[]>([]);
  const [entries, setEntries] = useState<TimewebLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [timeRangeId, setTimeRangeId] = useState<string>("1h");
  const [live, setLive] = useState(true);
  const [copyHint, setCopyHint] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToTopRef = useRef(true);

  const timeRange = useMemo(
    () => TIME_RANGE_OPTIONS.find((option) => option.id === timeRangeId) ?? TIME_RANGE_OPTIONS[1],
    [timeRangeId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadStatus(): Promise<void> {
      setStatusLoading(true);
      try {
        const res = await fetch("/api/admin/timeweb-logs/status", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("status_failed");
        }
        const body = (await res.json()) as {
          configured: boolean;
          sources: TimewebLogSource[];
        };
        if (cancelled) {
          return;
        }
        setConfigured(body.configured);
        setSources(body.sources ?? []);
        if (body.sources?.length) {
          setSourceId(body.sources[0].id);
        }
      } catch {
        if (!cancelled) {
          setConfigured(false);
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    }
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!configured || kind !== "deploy") {
      return;
    }
    let cancelled = false;
    async function loadDeploys(): Promise<void> {
      try {
        const res = await fetch(
          `/api/admin/timeweb-logs/deploys?source=${encodeURIComponent(sourceId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          return;
        }
        const body = (await res.json()) as { deploys: TimewebDeploySummary[] };
        if (cancelled) {
          return;
        }
        const list = body.deploys ?? [];
        setDeploys(list);
        if (list.length > 0) {
          setDeployId(String(list[0].id));
        }
      } catch {
        // deploy list optional
      }
    }
    void loadDeploys();
    return () => {
      cancelled = true;
    };
  }, [configured, kind, sourceId]);

  const fetchLogs = useCallback(async (): Promise<void> => {
    if (!configured) {
      return;
    }
    if (kind === "deploy" && !deployId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        source: sourceId,
        kind,
        limit: "500",
        offset: "0",
      });
      if (kind === "deploy" && deployId) {
        params.set("deploy_id", deployId);
      }
      const res = await fetch(`/api/admin/timeweb-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as { entries?: TimewebLogEntry[]; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "load_failed");
      }
      setEntries(body.entries ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "load_failed";
      setError(message === "load_failed" ? "Не удалось загрузить логи" : message);
    } finally {
      setLoading(false);
    }
  }, [configured, deployId, kind, sourceId]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!live || !configured) {
      return;
    }
    const timer = window.setInterval(() => {
      void fetchLogs();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [live, configured, fetchLogs]);

  useEffect(() => {
    if (!stickToTopRef.current || !listRef.current) {
      return;
    }
    listRef.current.scrollTop = 0;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    const fromMs = timeRange.ms ? now - timeRange.ms : null;
    return entries
      .filter((entry) => {
        if (fromMs && entry.timestamp_ms && entry.timestamp_ms < fromMs) {
          return false;
        }
        if (!query) {
          return true;
        }
        const haystack =
          `${entry.raw} ${entry.message} ${entry.service} ${entry.level}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((left, right) => {
        const leftTime = left.timestamp_ms ?? 0;
        const rightTime = right.timestamp_ms ?? 0;
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return Number(right.id) - Number(left.id);
      });
  }, [entries, search, timeRange.ms]);

  const histogram = useMemo(
    () => buildHistogram(filteredEntries, timeRange.ms),
    [filteredEntries, timeRange.ms]
  );

  function handleListScroll(): void {
    const node = listRef.current;
    if (!node) {
      return;
    }
    stickToTopRef.current = node.scrollTop < 80;
  }

  function entriesForExport(): TimewebLogEntry[] {
    return [...filteredEntries].reverse();
  }

  async function handleCopy(): Promise<void> {
    const text = entriesForExport()
      .map((entry) => entry.raw)
      .join("\n");
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint("Скопировано");
      window.setTimeout(() => setCopyHint(""), 2000);
    } catch {
      setCopyHint("Не удалось скопировать");
    }
  }

  function handleDownload(): void {
    const text = entriesForExport()
      .map((entry) => entry.raw)
      .join("\n");
    if (!text) {
      return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `timeweb-${sourceId}-${kind}-${stamp}.log`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (statusLoading) {
    return <p className={adminPanelMutedTextClass}>Проверка Timeweb…</p>;
  }

  if (!configured) {
    return (
      <div className={`${adminPanelCardClass} p-8`}>
        <h2 className="text-[20px] font-extrabold text-[#5F5E5E]">Логи Timeweb не настроены</h2>
        <p className={`mt-3 ${adminPanelMutedTextClass}`}>
          Задайте на сервере переменные{" "}
          <code className="rounded bg-white/70 px-1.5 py-0.5 text-[14px]">TIMEWEB_API_TOKEN</code>{" "}
          и{" "}
          <code className="rounded bg-white/70 px-1.5 py-0.5 text-[14px]">TIMEWEB_APP_ID</code>.
          Токен создаётся в панели Timeweb → API.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`${adminPanelCardClass} flex flex-wrap items-center justify-between gap-3 p-4`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по логам"
              className="w-full rounded-2xl border border-black/10 bg-white/80 py-2.5 pl-10 pr-4 text-[14px] font-medium text-[#5F5E5E] outline-none focus:border-[#00B596]/50"
            />
          </label>
          {sources.length > 1 && (
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className={selectClass}
              aria-label="Приложение"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          )}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as TimewebLogKind)}
            className={selectClass}
            aria-label="Тип логов"
          >
            <option value="runtime">Runtime</option>
            <option value="deploy">Deploy</option>
          </select>
          {kind === "deploy" && (
            <select
              value={deployId}
              onChange={(event) => setDeployId(event.target.value)}
              className={selectClass}
              aria-label="Деплой"
            >
              {deploys.map((deploy) => (
                <option key={String(deploy.id)} value={String(deploy.id)}>
                  #{deploy.id} {deploy.status ?? ""} {deploy.created_at ?? ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={timeRangeId}
            onChange={(event) => setTimeRangeId(event.target.value)}
            className={selectClass}
            aria-label="Диапазон времени"
          >
            {TIME_RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ToolbarIconButton
            label={live ? "Пауза live tail" : "Возобновить live tail"}
            onClick={() => setLive((value) => !value)}
          >
            {live ? <PauseIcon /> : <PlayIcon />}
          </ToolbarIconButton>
          <ToolbarIconButton label="Копировать логи" onClick={() => void handleCopy()}>
            <CopyIcon />
          </ToolbarIconButton>
          <ToolbarIconButton label="Скачать логи" onClick={handleDownload}>
            <DownloadIcon />
          </ToolbarIconButton>
        </div>
      </div>

      {copyHint ? <p className="text-[13px] font-bold text-[#007A68]">{copyHint}</p> : null}
      {error ? <p className="text-[14px] font-bold text-red-700">{error}</p> : null}

      <div
        className={`${adminPanelCardClass} flex h-16 items-end gap-0.5 overflow-hidden px-3 py-2`}
        aria-hidden="true"
      >
        {histogram.map((bucket) => (
          <div
            key={bucket.key}
            className={`min-w-[3px] flex-1 rounded-t-sm ${
              bucket.hasError ? "bg-red-500/80" : "bg-[#00B596]/60"
            }`}
            style={{ height: `${Math.max(8, bucket.height)}%` }}
          />
        ))}
      </div>

      <div className={`${adminPanelCardClass} overflow-hidden`}>
        <div className="grid grid-cols-[140px_100px_1fr] gap-3 border-b border-black/10 bg-white/40 px-4 py-2 text-[12px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
          <span>Time (GMT+3)</span>
          <span>Service</span>
          <span>Data</span>
        </div>
        <div
          ref={listRef}
          className="max-h-[min(70vh,720px)] overflow-y-auto font-mono text-[13px]"
          onScroll={handleListScroll}
        >
          {loading && filteredEntries.length === 0 && (
            <p className={`p-6 ${adminPanelMutedTextClass}`}>Загрузка логов…</p>
          )}
          {!loading && filteredEntries.length === 0 && (
            <p className={`p-6 ${adminPanelMutedTextClass}`}>Нет строк за выбранный период</p>
          )}
          {filteredEntries.map((entry) => (
            <div
              key={`${entry.id}-${entry.raw.slice(0, 24)}`}
              className={`grid grid-cols-[140px_100px_1fr] gap-3 border-b border-black/5 px-4 py-2 ${severityRowClass(entry.severity)}`}
            >
              <span className="shrink-0 text-[#8C8C8C]">
                {formatDisplayTime(entry.timestamp, entry.timestamp_ms)}
              </span>
              <span className="truncate text-[#5F5E5E]">{entry.service}</span>
              <span className="break-all text-[#4F4F4F]">{entry.message || entry.raw}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[13px] text-[#8C8C8C]">
        {filteredEntries.length} строк · {live ? "live" : "paused"} · {sourceId} / {kind}
      </p>
    </div>
  );
}

const selectClass =
  "rounded-2xl border border-black/10 bg-white/80 px-3 py-2.5 text-[14px] font-medium text-[#5F5E5E] outline-none focus:border-[#00B596]/50";

function severityRowClass(severity: TimewebLogEntry["severity"]): string {
  switch (severity) {
    case "error":
      return "bg-red-50/80";
    case "warn":
      return "bg-amber-50/70";
    case "debug":
      return "bg-white/40";
    default:
      return "bg-white/20";
  }
}

function formatDisplayTime(timestamp: string | null, timestampMs: number | null): string {
  if (timestampMs) {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(timestampMs));
  }
  return timestamp ?? "—";
}

function buildHistogram(entries: TimewebLogEntry[], rangeMs: number): HistogramBucket[] {
  const bucketCount = 24;
  const now = Date.now();
  const span = rangeMs > 0 ? rangeMs : 60 * 60 * 1000;
  const buckets: HistogramBucket[] = [];

  for (let index = 0; index < bucketCount; index += 1) {
    const bucketStart = now - span + (index * span) / bucketCount;
    const bucketEnd = bucketStart + span / bucketCount;
    const inBucket = entries.filter((entry) => {
      const ms = entry.timestamp_ms;
      if (!ms) {
        return false;
      }
      return ms >= bucketStart && ms < bucketEnd;
    });
    const count = inBucket.length;
    const hasError = inBucket.some((entry) => entry.severity === "error");
    buckets.push({
      key: String(index),
      height: count === 0 ? 8 : Math.min(100, 12 + count * 8),
      hasError,
    });
  }

  return buckets;
}

type ToolbarIconButtonProps = {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarIconButton({
  label,
  onClick,
  children,
}: ToolbarIconButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-10 items-center justify-center rounded-full bg-white/80 text-[#5F5E5E] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.12)] transition hover:bg-white"
    >
      {children}
    </button>
  );
}

function SearchIcon(): React.ReactElement {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8C8C8C]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}

function PlayIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

function CopyIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DownloadIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
