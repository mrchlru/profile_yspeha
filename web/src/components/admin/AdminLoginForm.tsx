"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { useAdminSession } from "@/hooks/useAdminSession";
import {
  adminFieldLabelClass,
  adminInputClass,
  adminPanelCardClass,
  adminPrimaryButtonClass,
} from "@/lib/admin/adminPanelTheme";

/**
 * Форма входа в админ-панель по почте и паролю.
 */
export function AdminLoginForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "authenticated") {
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin/create-test");
    }
  }, [session.status, searchParams, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось войти.");
        return;
      }
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin/create-test");
      router.refresh();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <form
        onSubmit={(event) => void submit(event)}
        className={`w-full max-w-[420px] space-y-5 p-8 ${adminPanelCardClass} shadow-[var(--admin-shadow-elevated)]`}
      >
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-[16px] bg-[var(--admin-accent)] text-[22px] font-bold text-white">
            D
          </span>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-[var(--admin-text)]">
            Вход в админ-панель
          </h1>
          <p className="mt-2 text-[15px] text-[var(--admin-text-3)]">DriveS · учётная запись администратора</p>
        </div>

        <div>
          <label htmlFor="admin-email" className={adminFieldLabelClass}>
            Почта
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={adminInputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="admin-password" className={adminFieldLabelClass}>
            Пароль
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={adminInputClass}
            required
          />
        </div>

        {error ? (
          <p className="text-[14px] font-medium text-[var(--admin-danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || session.status === "loading"}
          className={`${adminPrimaryButtonClass} w-full`}
        >
          {busy ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
