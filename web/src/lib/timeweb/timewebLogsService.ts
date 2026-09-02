import type {
  TimewebDeploySummary,
  TimewebLogEntry,
  TimewebLogKind,
  TimewebLogSource,
  TimewebLogsResponse,
  TimewebLogsStatus,
} from "@/lib/timeweb/timewebLogsTypes";

const TIMEWEB_API_BASE = "https://api.timeweb.cloud";
const DEFAULT_SOURCE_ID = "profile";
const MAX_LIMIT = 500;

/**
 * Проверяет, настроен ли доступ к Timeweb Cloud API для просмотра логов.
 */
export function isTimewebLogsConfigured(): boolean {
  return Boolean(process.env.TIMEWEB_API_TOKEN?.trim() && process.env.TIMEWEB_APP_ID?.trim());
}

/**
 * Список приложений Timeweb, для которых доступны логи в админ-панели.
 */
export function listTimewebLogSources(): TimewebLogSource[] {
  const appId = process.env.TIMEWEB_APP_ID?.trim();
  if (!appId) {
    return [];
  }
  return [{ id: DEFAULT_SOURCE_ID, label: "Профиль Успеха", appId }];
}

/**
 * Возвращает статус интеграции Timeweb logs для админ-панели.
 */
export function getTimewebLogsStatus(): TimewebLogsStatus {
  const configured = isTimewebLogsConfigured();
  return {
    configured,
    sources: configured ? listTimewebLogSources() : [],
  };
}

/**
 * Загружает список деплоев приложения Timeweb.
 */
export async function fetchTimewebDeploys(sourceId?: string): Promise<TimewebDeploySummary[]> {
  const source = resolveTimewebLogSource(sourceId);
  const payload = await timewebApiGet(`/api/v1/apps/${source.appId}/deploys`);
  const deploys = extractDeployList(payload);
  return deploys.map(normalizeDeploySummary);
}

/**
 * Загружает логи runtime или deploy из Timeweb Cloud API.
 */
export async function fetchTimewebLogs(options: {
  sourceId?: string;
  kind?: TimewebLogKind;
  deployId?: string | number | null;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<TimewebLogsResponse> {
  const source = resolveTimewebLogSource(options.sourceId);
  const kind: TimewebLogKind = options.kind === "deploy" ? "deploy" : "runtime";
  const limit = clampLimit(options.limit);
  const offset = Math.max(0, options.offset ?? 0);
  const search = options.search?.trim().toLowerCase() ?? "";

  let payload: unknown;
  let deployId: number | string | null = null;

  if (kind === "deploy") {
    deployId = await resolveDeployId(source.appId, options.deployId);
    payload = await timewebApiGet(
      `/api/v1/apps/${source.appId}/deploy/${deployId}/logs`
    );
  } else {
    payload = await timewebApiGet(`/api/v1/apps/${source.appId}/logs`);
  }

  const rawLines = extractLogLines(payload);
  let entries = rawLines.map((line, index) => parseTimewebLogLine(line, index));

  if (search) {
    entries = entries.filter((entry) => {
      const haystack = `${entry.raw} ${entry.message} ${entry.service} ${entry.level}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  const total = entries.length;
  const page = entries.slice(offset, offset + limit);

  return {
    entries: page,
    total,
    source: source.id,
    kind,
    deploy_id: deployId,
  };
}

function resolveTimewebLogSource(sourceId?: string): TimewebLogSource {
  const sources = listTimewebLogSources();
  if (sources.length === 0) {
    throw new TimewebLogsError("Timeweb logs не настроены", 503);
  }
  const normalized = (sourceId?.trim() || DEFAULT_SOURCE_ID).toLowerCase();
  const match = sources.find((source) => source.id.toLowerCase() === normalized);
  if (!match) {
    throw new TimewebLogsError(`Неизвестный источник логов: ${sourceId}`, 400);
  }
  return match;
}

async function resolveDeployId(
  appId: string,
  deployId?: string | number | null
): Promise<number | string> {
  if (deployId !== undefined && deployId !== null && String(deployId).trim() !== "") {
    return deployId;
  }
  const deploys = await fetchTimewebDeploys(DEFAULT_SOURCE_ID);
  if (deploys.length === 0) {
    throw new TimewebLogsError("Нет деплоев для выбранного приложения", 404);
  }
  return deploys[0].id;
}

async function timewebApiGet(path: string): Promise<unknown> {
  const token = process.env.TIMEWEB_API_TOKEN?.trim();
  if (!token) {
    throw new TimewebLogsError("TIMEWEB_API_TOKEN не задан", 503);
  }

  const url = `${TIMEWEB_API_BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Сеть недоступна";
    throw new TimewebLogsError(`Timeweb API: ${message}`, 502);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail = extractApiErrorDetail(payload) ?? response.statusText;
    throw new TimewebLogsError(`Timeweb API ${response.status}: ${detail}`, response.status);
  }

  return payload;
}

function extractApiErrorDetail(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim().slice(0, 300);
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}

function extractDeployList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["deploys", "items", "data", "result"]) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }
  return [];
}

function normalizeDeploySummary(raw: unknown): TimewebDeploySummary {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const rawId = record.id ?? record.deploy_id;
    const id: number | string =
      typeof rawId === "string" || typeof rawId === "number" ? rawId : "?";
    return {
      id,
      status: typeof record.status === "string" ? record.status : null,
      created_at:
        typeof record.created_at === "string"
          ? record.created_at
          : typeof record.createdAt === "string"
            ? record.createdAt
            : null,
    };
  }
  return { id: "?", status: null, created_at: null };
}

function extractLogLines(payload: unknown): string[] {
  if (typeof payload === "string") {
    return payload.split(/\r?\n/).filter((line) => line.length > 0);
  }
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => lineFromUnknown(item));
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["logs", "items", "data", "result", "lines"]) {
      const value = record[key];
      if (typeof value === "string") {
        return value.split(/\r?\n/).filter((line) => line.length > 0);
      }
      if (Array.isArray(value)) {
        return value.flatMap((item) => lineFromUnknown(item));
      }
    }
  }
  return [];
}

function lineFromUnknown(item: unknown): string[] {
  if (typeof item === "string") {
    return item.split(/\r?\n/).filter((line) => line.length > 0);
  }
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    for (const key of ["message", "log", "text", "line", "raw"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return [value];
      }
    }
    return [JSON.stringify(item)];
  }
  return [];
}

function parseTimewebLogLine(raw: string, index: number): TimewebLogEntry {
  const trimmed = raw.trimEnd();
  const bracketMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
  const bracketContent = bracketMatch?.[1] ?? "";
  const rest = bracketMatch?.[2] ?? trimmed;

  let timestamp: string | null = null;
  let timestampMs: number | null = null;
  let service = "app";
  let level = "info";
  let message = rest;

  const isoInBrackets = bracketContent.match(
    /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/
  );
  if (isoInBrackets) {
    timestamp = isoInBrackets[0];
    timestampMs = Date.parse(timestamp.replace(" ", "T"));
    if (Number.isNaN(timestampMs)) {
      timestampMs = null;
    }
  }

  const levelMatch = rest.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL|CRITICAL)\b/i);
  if (levelMatch) {
    level = levelMatch[1].toLowerCase();
  }

  const serviceMatch = bracketContent.match(/^([a-zA-Z0-9_.-]+)/);
  if (serviceMatch && !isoInBrackets?.[0]?.startsWith(serviceMatch[1])) {
    service = serviceMatch[1];
  }

  const jsonStart = rest.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(rest.slice(jsonStart)) as Record<string, unknown>;
      if (typeof parsed.msg === "string") {
        message = parsed.msg;
      } else if (typeof parsed.message === "string") {
        message = parsed.message;
      }
      if (typeof parsed.level === "string") {
        level = parsed.level.toLowerCase();
      }
    } catch {
      // оставляем rest как message
    }
  }

  return {
    id: String(index),
    raw: trimmed,
    message: message.trim() || trimmed,
    service,
    level,
    severity: severityFromLevel(level),
    timestamp,
    timestamp_ms: timestampMs,
  };
}

function severityFromLevel(level: string): TimewebLogEntry["severity"] {
  const normalized = level.toLowerCase();
  if (["error", "fatal", "critical", "err"].includes(normalized)) {
    return "error";
  }
  if (["warn", "warning"].includes(normalized)) {
    return "warn";
  }
  if (["debug", "trace"].includes(normalized)) {
    return "debug";
  }
  return "info";
}

function clampLimit(limit?: number): number {
  if (limit === undefined || Number.isNaN(limit)) {
    return 200;
  }
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

/**
 * Ошибка прокси Timeweb logs с HTTP-статусом для API.
 */
export class TimewebLogsError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TimewebLogsError";
    this.status = status;
  }
}
