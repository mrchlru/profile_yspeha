import type { AdminRole } from "@/lib/admin/adminRoles";

export type CachedAdminSession =
  | { status: "guest" }
  | {
      status: "authenticated";
      email: string;
      role: AdminRole;
      roleLabel: string;
    };

let cachedSession: CachedAdminSession | null = null;
let cachedAt = 0;
const SESSION_CACHE_TTL_MS = 60_000;

/**
 * Возвращает кэш сессии админки, если он ещё свежий.
 */
export function readAdminSessionCache(): CachedAdminSession | null {
  if (cachedSession === null) {
    return null;
  }
  if (Date.now() - cachedAt > SESSION_CACHE_TTL_MS) {
    return null;
  }
  return cachedSession;
}

/**
 * Сохраняет сессию админки в памяти вкладки.
 */
export function writeAdminSessionCache(session: CachedAdminSession): void {
  cachedSession = session;
  cachedAt = Date.now();
}

/**
 * Сбрасывает кэш сессии (после login/logout).
 */
export function clearAdminSessionCache(): void {
  cachedSession = null;
  cachedAt = 0;
}
