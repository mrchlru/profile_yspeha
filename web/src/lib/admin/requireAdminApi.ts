import type { NextRequest } from "next/server";

import { readAdminAuthConfig } from "@/lib/admin/adminAuthConfig";
import type { AdminSessionUser } from "@/lib/admin/adminRoles";
import {
  getAdminSessionFromRequest,
  isFullAdmin,
  isPanelUser,
} from "@/lib/admin/adminSession";

export type AdminApiAuthResult =
  | {
      ok: true;
      user: AdminSessionUser;
      config: NonNullable<ReturnType<typeof readAdminAuthConfig>>;
    }
  | { ok: false; status: number; error: string };

/**
 * Требует активную сессию админ-панели (администратор или HrD).
 */
export async function requireAdminPanelSession(req: NextRequest): Promise<AdminApiAuthResult> {
  const config = readAdminAuthConfig();
  if (!config) {
    return { ok: false, status: 503, error: "Админ-панель не настроена" };
  }

  const user = await getAdminSessionFromRequest(req, config.sessionSecret);
  if (!user || !isPanelUser(user)) {
    return { ok: false, status: 401, error: "Требуется вход в админ-панель" };
  }

  return { ok: true, user, config };
}

/**
 * Требует сессию с полным доступом администратора.
 */
export async function requireFullAdminSession(req: NextRequest): Promise<AdminApiAuthResult> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return auth;
  }

  if (!isFullAdmin(auth.user)) {
    return { ok: false, status: 403, error: "Недостаточно прав" };
  }

  return auth;
}
