import { shortSessionRef } from "@/lib/logging/screeningSessionRef";

type ClientMeta = Record<string, string | number | boolean | null | undefined>;

/**
 * Лог на клиенте: этапы прохождения и отправка (без ПДн и ответов анкеты).
 * Всегда пишет в console; в production можно фильтровать по префиксу `scope":"screening:client"`.
 */
export function screeningClientLog(message: string, meta?: ClientMeta): void {
  if (typeof window === "undefined") {
    return;
  }
  const ts = new Date().toISOString();
  const payload: Record<string, unknown> = {
    ts,
    scope: "screening:client",
    message,
  };
  if (meta !== undefined) {
    Object.assign(payload, meta);
  }
  console.log(JSON.stringify(payload));
}

/**
 * Укороченный ref сессии для клиентских логов.
 */
export function clientSessionRef(sessionId: string | null): string | null {
  if (sessionId === null || sessionId.length === 0) {
    return null;
  }
  return shortSessionRef(sessionId);
}
