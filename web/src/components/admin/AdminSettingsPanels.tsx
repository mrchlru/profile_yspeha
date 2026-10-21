"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import {
  adminFieldLabelClass,
  adminInputClass,
  adminPanelMutedTextClass,
  adminPrimaryButtonClass,
  adminSecondaryMutedButtonClass,
} from "@/lib/admin/adminPanelTheme";
import { formatAdminDateTimeShort } from "@/lib/datetime/adminDateFormat";
import { useAdminSession } from "@/hooks/useAdminSession";

/**
 * Уведомление для администратора о смене учётных данных через env (legacy export).
 */
export function AdminCredentialsNotice(): React.ReactElement {
  const { session } = useAdminSession();
  return (
    <p className={adminPanelMutedTextClass}>
      {session.status === "authenticated" ? session.email : "Администратор"} — задаётся на сервере.
    </p>
  );
}

export type MyCredentialsFormProps = {
  embedded?: boolean;
};

/**
 * Форма смены почты и пароля для HrD.
 */
export function MyCredentialsForm({ embedded = false }: MyCredentialsFormProps): React.ReactElement {
  void embedded;
  const { session } = useAdminSession();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "authenticated") {
      setEmail(session.email);
    }
  }, [session]);

  async function save(): Promise<void> {
    setError(null);
    setSuccess(null);
    if (!currentPassword) {
      setError("Введите текущий пароль.");
      return;
    }
    if (!email.trim() && newPassword.length < 8) {
      setError("Укажите новую почту и/или пароль не короче 8 символов.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          email: email.trim() || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const body = (await res.json()) as { email?: string; error?: string };
      if (!res.ok || !body.email) {
        setError(body.error ?? "Не удалось обновить доступ.");
        return;
      }
      setEmail(body.email);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Сохранено.");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="my-email" className={adminFieldLabelClass}>
          Почта
        </label>
        <input
          id="my-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Оставьте пустым, если не меняете"
          className={adminInputClass}
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="my-current-password" className={adminFieldLabelClass}>
          Текущий пароль
        </label>
        <input
          id="my-current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={adminInputClass}
        />
      </div>

      <div>
        <label htmlFor="my-new-password" className={adminFieldLabelClass}>
          Новый пароль
        </label>
        <input
          id="my-new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Оставьте пустым, если не меняете"
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

      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={busy} className={adminPrimaryButtonClass}>
          {busy ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}

type GoogleSheetsTestResponse = {
  env: {
    configured: boolean;
    hasSpreadsheetId: boolean;
    hasServiceAccountJson: boolean;
    serviceAccountEmail: string | null;
    configError: string | null;
  };
  ok: boolean;
  message: string;
  error: string | null;
};

export type GoogleSheetsTestPanelProps = {
  embedded?: boolean;
  onStatusChange?: (ok: boolean) => void;
};

export function GoogleSheetsTestPanel({
  onStatusChange,
}: GoogleSheetsTestPanelProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GoogleSheetsTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    void checkConnection(false);
  }, []);

  async function checkConnection(writeTestRow: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        writeTestRow ? "/api/admin/google-sheets/test" : "/api/admin/google-sheets/test",
        writeTestRow
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ writeTestRow: true }),
            }
          : { cache: "no-store" }
      );
      const body = (await res.json()) as GoogleSheetsTestResponse | { error?: string };
      if ("error" in body && body.error && !("ok" in body)) {
        setError(body.error);
        setResult(null);
        onStatusChange?.(false);
        return;
      }
      const typed = body as GoogleSheetsTestResponse;
      setResult(typed);
      onStatusChange?.(typed.ok);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      onStatusChange?.(false);
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = result?.ok ? "Подключено" : result ? "Не подключено" : "…";

  return (
    <div className="space-y-4">
      <p className={`text-[14px] ${adminPanelMutedTextClass}`}>
        Статус: <span className="font-medium text-[var(--admin-text)]">{statusLabel}</span>
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void checkConnection(false)}
          className={adminSecondaryMutedButtonClass}
        >
          {busy ? "Проверка…" : "Проверить подключение"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void checkConnection(true)}
          className={adminSecondaryMutedButtonClass}
        >
          Записать тестовую строку
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {result?.message ? (
        <p className={`text-[14px] ${adminPanelMutedTextClass}`}>{result.message}</p>
      ) : null}

      {result && !result.ok ? (
        <div>
          <button
            type="button"
            className="text-[14px] font-medium text-[var(--admin-accent)] hover:underline"
            onClick={() => setDetailsOpen((value) => !value)}
          >
            {detailsOpen ? "Скрыть подробности" : "Подробности для администратора"}
          </button>
          {detailsOpen ? (
            <ul className={`mt-2 space-y-1 text-[13px] font-mono ${adminPanelMutedTextClass}`}>
              <li>GOOGLE_SHEETS_SPREADSHEET_ID: {result.env.hasSpreadsheetId ? "задан" : "нет"}</li>
              <li>GOOGLE_SERVICE_ACCOUNT_JSON: {result.env.hasServiceAccountJson ? "задан" : "нет"}</li>
              {result.env.serviceAccountEmail ? <li>{result.env.serviceAccountEmail}</li> : null}
              {result.error ? <li>{result.error}</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type OpenAiTestResponse = {
  env: {
    hasApiKey: boolean;
    hasBaseUrl: boolean;
    hasRelaySecret: boolean;
    baseUrlHost: string | null;
    model: string;
  };
  ok: boolean;
  message: string;
  error: string | null;
  durationMs: number | null;
};

export type OpenAiTestPanelProps = {
  embedded?: boolean;
  onStatusChange?: (ok: boolean, configured: boolean) => void;
};

export function OpenAiTestPanel({
  onStatusChange,
}: OpenAiTestPanelProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OpenAiTestResponse | null>(null);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    void loadEnvStatus();
  }, []);

  async function loadEnvStatus(): Promise<void> {
    try {
      const res = await fetch("/api/admin/openai/test", { cache: "no-store" });
      const body = (await res.json()) as { configured?: boolean; env?: OpenAiTestResponse["env"] };
      if (res.ok && body.env) {
        setConfigured(body.configured === true);
        setResult({
          env: body.env,
          ok: body.configured === true,
          message: body.configured ? "Ключ задан на сервере" : "Не настроено",
          error: null,
          durationMs: null,
        });
        onStatusChange?.(body.configured === true, body.configured === true);
      }
    } catch {
      /* ignore */
    }
  }

  async function checkConnection(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/openai/test", { method: "POST" });
      const body = (await res.json()) as OpenAiTestResponse | { error?: string };
      if ("error" in body && body.error && !("ok" in body)) {
        setError(body.error);
        onStatusChange?.(false, configured);
        return;
      }
      const typed = body as OpenAiTestResponse;
      setResult(typed);
      setConfigured(typed.env.hasApiKey);
      setLastChecked(new Date().toISOString());
      onStatusChange?.(typed.ok, typed.env.hasApiKey);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = result?.ok ? "Подключено" : result ? "Ошибка" : "…";

  return (
    <div className="space-y-4">
      <p className={`text-[14px] ${adminPanelMutedTextClass}`}>
        Статус: <span className="font-medium text-[var(--admin-text)]">{statusLabel}</span>
        {lastChecked ? (
          <span className="block text-[13px]">
            Проверено {formatAdminDateTimeShort(lastChecked)}
          </span>
        ) : null}
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void checkConnection()}
        className={adminSecondaryMutedButtonClass}
      >
        {busy ? "Проверка…" : "Проверить связь"}
      </button>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {result?.message && !error ? (
        <p className={`text-[14px] ${adminPanelMutedTextClass}`}>{result.message}</p>
      ) : null}

      {!configured || (result && !result.ok) ? (
        <div>
          <button
            type="button"
            className="text-[14px] font-medium text-[var(--admin-accent)] hover:underline"
            onClick={() => setDetailsOpen((value) => !value)}
          >
            {detailsOpen ? "Скрыть подробности" : "Подробности для администратора"}
          </button>
          {detailsOpen ? (
            <p className={`mt-2 text-[13px] ${adminPanelMutedTextClass}`}>
              См. docs/ENV.md: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_RELAY_SECRET, OPENAI_MODEL.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
