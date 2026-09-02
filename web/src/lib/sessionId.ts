/**
 * Создаёт непрозрачный идентификатор сессии прохождения скрининга.
 */
export function generateSessionId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Короткий человекочитаемый код для отображения в UI и поддержке.
 */
export function formatSessionCode(sessionId: string): string {
  return sessionId.replace(/-/g, "").slice(0, 8).toUpperCase();
}
