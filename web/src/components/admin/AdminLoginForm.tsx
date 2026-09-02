"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
  stepSurfaceCardClass,
  stepSectionTitleClass,
} from "@/lib/stepPageTheme";

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
    <StepLayout hideHeaderTitle>
      <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-2">
        <form
          onSubmit={(event) => void submit(event)}
          className={`w-full max-w-[480px] space-y-6 px-8 py-8 ${stepSurfaceCardClass}`}
        >
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#8C8C8C]">
              DriveS
            </p>
            <h1 className={`${stepSectionTitleClass} !mb-2`}>Вход в админ-панель</h1>
          </div>

          <div>
            <label htmlFor="admin-email" className={`block ${stepLabelClass}`}>
              Почта
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`${stepInputClass} h-12 text-[16px]`}
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password" className={`block ${stepLabelClass}`}>
              Пароль
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${stepInputClass} h-12 text-[16px]`}
              required
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-700/90" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={busy || session.status === "loading"}
            className={stepNavPrimaryButtonClass}
          >
            {busy ? "Вход…" : "Войти"}
          </Button>
        </form>
      </div>
    </StepLayout>
  );
}
