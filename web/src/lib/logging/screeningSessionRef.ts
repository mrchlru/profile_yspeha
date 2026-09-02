/**
 * Короткий идентификатор сессии для корреляции логов без полного session_id в каждой строке.
 */
export function shortSessionRef(sessionId: string): string {
  if (sessionId.length <= 12) {
    return sessionId;
  }
  return `${sessionId.slice(0, 10)}…`;
}
