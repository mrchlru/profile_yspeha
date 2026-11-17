const OUTBOX_STORAGE_KEY = "screening_sync_outbox_v1";
const MAX_ITEMS = 80;
const MAX_ATTEMPTS = 8;

export type SyncOutboxItem = {
  id: string;
  url: string;
  body: string;
  createdAt: string;
  attempts: number;
};

type SyncOutboxListener = (pendingCount: number) => void;

const listeners = new Set<SyncOutboxListener>();
let drainInFlight = false;

/**
 * Читает очередь отложенных sync-запросов из localStorage.
 */
export function readSyncOutbox(): SyncOutboxItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(_isOutboxItem);
  } catch {
    return [];
  }
}

/**
 * Добавляет запрос в очередь (или обновляет существующий с тем же id).
 */
export function enqueueSyncOutbox(item: Omit<SyncOutboxItem, "attempts" | "createdAt">): void {
  if (typeof window === "undefined") {
    return;
  }
  const items = readSyncOutbox().filter((row) => row.id !== item.id);
  items.push({
    ...item,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  while (items.length > MAX_ITEMS) {
    items.shift();
  }
  localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
  _notify(items.length);
}

/**
 * Отправляет накопившиеся запросы при появлении сети.
 */
export async function drainSyncOutbox(): Promise<number> {
  if (typeof window === "undefined" || drainInFlight) {
    return 0;
  }
  drainInFlight = true;
  let sent = 0;
  try {
    const items = readSyncOutbox();
    const remaining: SyncOutboxItem[] = [];
    for (const item of items) {
      const ok = await _postOutboxItem(item);
      if (ok) {
        sent += 1;
        continue;
      }
      const attempts = item.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        remaining.push({ ...item, attempts });
      }
    }
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(remaining));
    _notify(remaining.length);
    return sent;
  } finally {
    drainInFlight = false;
  }
}

export function getSyncOutboxPendingCount(): number {
  return readSyncOutbox().length;
}

export function subscribeSyncOutbox(listener: SyncOutboxListener): () => void {
  listeners.add(listener);
  listener(getSyncOutboxPendingCount());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * POST с проверкой ответа; при ошибке кладёт в очередь.
 */
export async function postJsonWithSyncOutbox(
  url: string,
  body: unknown,
  outboxId: string
): Promise<boolean> {
  const bodyText = JSON.stringify(body);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: bodyText,
    });
    if (res.ok) {
      return true;
    }
    enqueueSyncOutbox({ id: outboxId, url, body: bodyText });
    return false;
  } catch {
    enqueueSyncOutbox({ id: outboxId, url, body: bodyText });
    return false;
  }
}

async function _postOutboxItem(item: SyncOutboxItem): Promise<boolean> {
  try {
    const res = await fetch(item.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: item.body,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function _notify(pendingCount: number): void {
  for (const listener of listeners) {
    listener(pendingCount);
  }
}

function _isOutboxItem(value: unknown): value is SyncOutboxItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.url === "string" &&
    typeof row.body === "string" &&
    typeof row.createdAt === "string" &&
    typeof row.attempts === "number"
  );
}