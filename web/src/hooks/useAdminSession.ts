"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminRole } from "@/lib/admin/adminRoles";
import {
  clearAdminSessionCache,
  readAdminSessionCache,
  writeAdminSessionCache,
} from "@/lib/admin/adminSessionCache";

export type AdminSessionState =
  | { status: "loading" }
  | { status: "guest" }
  | {
      status: "authenticated";
      email: string;
      role: AdminRole;
      roleLabel: string;
    };

/**
 * Загружает текущую сессию админ-панели с сервера.
 */
export function useAdminSession(): {
  session: AdminSessionState;
  refresh: () => Promise<void>;
} {
  const [session, setSession] = useState<AdminSessionState>(() => {
    const cached = readAdminSessionCache();
    return cached ?? { status: "loading" };
  });

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/admin/auth/session", { cache: "no-store" });
      if (!res.ok) {
        const guest = { status: "guest" as const };
        writeAdminSessionCache(guest);
        setSession(guest);
        return;
      }
      const body = (await res.json()) as
        | { authenticated: false }
        | { authenticated: true; email: string; role: AdminRole; roleLabel: string };
      if (!body.authenticated) {
        const guest = { status: "guest" as const };
        writeAdminSessionCache(guest);
        setSession(guest);
        return;
      }
      const next = {
        status: "authenticated" as const,
        email: body.email,
        role: body.role,
        roleLabel: body.roleLabel,
      };
      writeAdminSessionCache(next);
      setSession(next);
    } catch {
      const guest = { status: "guest" as const };
      writeAdminSessionCache(guest);
      setSession(guest);
    }
  }, []);

  useEffect(() => {
    const cached = readAdminSessionCache();
    if (cached !== null) {
      setSession(cached);
    }
    void refresh();
  }, [refresh]);

  return { session, refresh };
}

export { clearAdminSessionCache };
