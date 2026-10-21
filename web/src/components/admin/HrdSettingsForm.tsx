"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import {
  adminFieldLabelClass,
  adminInputClass,
  adminPanelMutedTextClass,
  adminPrimaryButtonClass,
} from "@/lib/admin/adminPanelTheme";

type HrdSettingsResponse = {
  configured: boolean;
  email: string | null;
  updatedAt: string | null;
};

export type HrdSettingsFormProps = {
  embedded?: boolean;
  onSaved?: () => void;
};

/**
 * Форма создания и обновления учётной записи HrD (только для администратора).
 */
export function HrdSettingsForm({
  embedded = false,
  onSaved,
}: HrdSettingsFormProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/hrd", { cache: "no-store" });
      const body = (await res.json()) as HrdSettingsResponse & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось загрузить настройки.");
        return;
      }
      setConfigured(body.configured);
      setEmail(body.email ?? "");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(): Promise<void> {
    setError(null);
    setSuccess(null);
    if (!email.trim() || password.length < 8) {
      setError("Укажите почту и пароль не короче 8 символов.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings/hrd", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await res.json()) as { email?: string; updatedAt?: string; error?: string };
      if (!res.ok || !body.email || !body.updatedAt) {
        setError(body.error ?? "Не удалось сохранить настройки.");
        return;
      }
      setConfigured(true);
      setEmail(body.email);
      setPassword("");
      setSuccess("Сохранено.");
      onSaved?.();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка…</p>;
  }

  return (
    <div className="space-y-5">
      {!embedded ? (
        <p className={adminPanelMutedTextClass}>При сохранении данные заменяются.</p>
      ) : (
        <p className={`text-[13px] ${adminPanelMutedTextClass}`}>При сохранении данные заменяются.</p>
      )}

      <div>
        <label htmlFor="hrd-email" className={adminFieldLabelClass}>
          Почта HrD
        </label>
        <input
          id="hrd-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={adminInputClass}
        />
      </div>

      <div>
        <label htmlFor="hrd-password" className={adminFieldLabelClass}>
          {configured ? "Новый пароль" : "Пароль"}
        </label>
        <input
          id="hrd-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={adminInputClass}
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-medium text-[var(--admin-ok)]" role="status">
          {success}
        </p>
      ) : null}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={() => void saveSettings()}
          disabled={busy}
          className={adminPrimaryButtonClass}
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
