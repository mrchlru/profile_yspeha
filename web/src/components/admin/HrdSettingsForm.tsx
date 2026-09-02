"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";

type HrdSettingsResponse = {
  configured: boolean;
  email: string | null;
  updatedAt: string | null;
};

/**
 * Форма создания и обновления учётной записи HrD (только для администратора).
 */
export function HrdSettingsForm(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [configured, setConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
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
      setUpdatedAt(body.updatedAt);
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
      setUpdatedAt(body.updatedAt);
      setPassword("");
      setSuccess(configured ? "Доступ HrD обновлён." : "Доступ HrD создан.");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className={stepSecondaryTextClass}>Загрузка настроек…</p>;
  }

  return (
    <div className={`max-w-[640px] space-y-6 px-6 py-6 ${stepSurfaceCardClass}`}>
      <div>
        <h2 className="text-[20px] font-extrabold text-[#5F5E5E]">Доступ HrD</h2>
        <p className={`mt-2 ${stepSecondaryTextClass}`}>
          Укажите почту и пароль, с которыми HrD сможет войти в админ-панель. При повторном
          сохранении данные заменяются.
        </p>
        {configured && updatedAt ? (
          <p className={`mt-2 text-[14px] text-[#007A68]`}>
            Учётная запись настроена. Обновлено:{" "}
            {formatMoscowDateTime(updatedAt)}
          </p>
        ) : (
          <p className={`mt-2 text-[14px] text-amber-800`}>Учётная запись HrD ещё не создана.</p>
        )}
      </div>

      <div>
        <label htmlFor="hrd-email" className={`block ${stepLabelClass}`}>
          Почта HrD
        </label>
        <input
          id="hrd-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`${stepInputClass} h-12 text-[16px]`}
        />
      </div>

      <div>
        <label htmlFor="hrd-password" className={`block ${stepLabelClass}`}>
          Пароль HrD
        </label>
        <input
          id="hrd-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`${stepInputClass} h-12 text-[16px]`}
          placeholder={configured ? "Новый пароль" : "Пароль для входа"}
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {success}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={() => void saveSettings()}
        disabled={busy}
        className={stepNavPrimaryButtonClass}
      >
        {busy ? "Сохранение…" : configured ? "Обновить доступ HrD" : "Создать доступ HrD"}
      </Button>
    </div>
  );
}
