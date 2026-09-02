"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
} from "@/lib/stepPageTheme";

/**
 * Уведомление для администратора о смене учётных данных через env.
 */
export function AdminCredentialsNotice(): React.ReactElement {
  return (
    <div className={`space-y-3 px-6 py-6 ${adminPanelCardClass}`}>
      <h2 className={adminPanelSectionTitleClass}>Мой доступ</h2>
      <p className={adminPanelMutedTextClass}>
        Учётная запись администратора задаётся в переменных окружения сервера:{" "}
        <span className="font-mono text-[14px]">ADMIN_PANEL_EMAIL</span> и{" "}
        <span className="font-mono text-[14px]">ADMIN_PANEL_PASSWORD</span>. Изменить почту или
        пароль из интерфейса нельзя — только через настройки деплоя.
      </p>
    </div>
  );
}

/**
 * Форма смены почты и пароля для HrD.
 */
export function MyCredentialsForm(): React.ReactElement {
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
      setSuccess("Данные для входа обновлены.");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      <div>
        <h2 className={adminPanelSectionTitleClass}>Мой доступ</h2>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Измените почту или пароль для входа в админ-панель.
        </p>
      </div>

      <div>
        <label htmlFor="my-email" className={`block ${stepLabelClass}`}>
          Новая почта
        </label>
        <input
          id="my-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Оставьте пустым, если не меняете"
          className={`${stepInputClass} h-12 text-[16px]`}
        />
      </div>

      <div>
        <label htmlFor="my-current-password" className={`block ${stepLabelClass}`}>
          Текущий пароль
        </label>
        <input
          id="my-current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={`${stepInputClass} h-12 text-[16px]`}
        />
      </div>

      <div>
        <label htmlFor="my-new-password" className={`block ${stepLabelClass}`}>
          Новый пароль
        </label>
        <input
          id="my-new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Оставьте пустым, если не меняете"
          className={`${stepInputClass} h-12 text-[16px]`}
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
        onClick={() => void save()}
        disabled={busy}
        className={stepNavPrimaryButtonClass}
      >
        {busy ? "Сохранение…" : "Сохранить мой доступ"}
      </Button>
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
  spreadsheetTitle: string | null;
  sheetTitles: string[];
  testRowWritten: boolean;
  testTab: string | null;
  message: string;
  error: string | null;
};

/**
 * Проверка Google Sheets на проде: статус env и тестовая запись в таблицу.
 */
export function GoogleSheetsTestPanel(): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GoogleSheetsTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkConnection(writeTestRow: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/google-sheets/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writeTestRow }),
      });
      const body = (await res.json()) as GoogleSheetsTestResponse | { error?: string };
      if ("error" in body && body.error && !("ok" in body)) {
        setError(body.error);
        setResult(null);
        return;
      }
      setResult(body as GoogleSheetsTestResponse);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      <div>
        <h2 className={adminPanelSectionTitleClass}>Google Таблицы</h2>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Переменные задаются в Railway:{" "}
          <span className="font-mono text-[14px]">GOOGLE_SHEETS_SPREADSHEET_ID</span> и{" "}
          <span className="font-mono text-[14px]">GOOGLE_SERVICE_ACCOUNT_JSON</span>. Таблицу
          нужно расшарить на email сервисного аккаунта с правом «Редактор».
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => void checkConnection(false)}
        >
          {busy ? "Проверка…" : "Проверить подключение"}
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={() => void checkConnection(true)}
          className={stepNavPrimaryButtonClass}
        >
          {busy ? "Запись…" : "Записать тестовую строку"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className={`rounded-2xl border px-4 py-4 text-[14px] ${
            result.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-amber-300 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          <p className="font-extrabold">{result.ok ? "OK" : "Не настроено или ошибка"}</p>
          <p className="mt-2">{result.message}</p>
          {result.error ? <p className="mt-2">{result.error}</p> : null}
          <ul className="mt-3 space-y-1 font-mono text-[13px]">
            <li>{`GOOGLE_SHEETS_SPREADSHEET_ID: ${result.env.hasSpreadsheetId ? "задан" : "нет"}`}</li>
            <li>{`GOOGLE_SERVICE_ACCOUNT_JSON: ${result.env.hasServiceAccountJson ? "задан" : "нет"}`}</li>
            {result.env.serviceAccountEmail ? (
              <li>{`client_email: ${result.env.serviceAccountEmail}`}</li>
            ) : null}
            {result.spreadsheetTitle ? <li>{`Таблица: ${result.spreadsheetTitle}`}</li> : null}
            {result.sheetTitles.length > 0 ? (
              <li>{`Листы: ${result.sheetTitles.join(", ")}`}</li>
            ) : null}
            {result.testRowWritten && result.testTab ? (
              <li>{`Тестовая строка записана на лист: ${result.testTab}`}</li>
            ) : null}
          </ul>
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
  reply: string | null;
  durationMs: number | null;
  httpStatus: number | null;
  message: string;
  error: string | null;
  hint: string | null;
};

/**
 * Проверка OpenAI / Railway relay: короткий запрос и ответ модели.
 */
export function OpenAiTestPanel(): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OpenAiTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkConnection(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/openai/test", { method: "POST" });
      const body = (await res.json()) as OpenAiTestResponse | { error?: string };
      if ("error" in body && body.error && !("ok" in body)) {
        setError(body.error);
        setResult(null);
        return;
      }
      setResult(body as OpenAiTestResponse);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      <div>
        <h2 className={adminPanelSectionTitleClass}>OpenAI / ChatGPT</h2>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Проверка ключа и маршрута через Railway relay. На сервере:{" "}
          <span className="font-mono text-[14px]">OPENAI_API_KEY</span>, при необходимости{" "}
          <span className="font-mono text-[14px]">OPENAI_BASE_URL</span> и{" "}
          <span className="font-mono text-[14px]">OPENAI_RELAY_SECRET</span>. Запрос минимальный
          (одно слово в ответе).
        </p>
      </div>

      <Button
        type="button"
        disabled={busy}
        onClick={() => void checkConnection()}
        className={stepNavPrimaryButtonClass}
      >
        {busy ? "Проверка…" : "Проверить связь с OpenAI"}
      </Button>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className={`rounded-2xl border px-4 py-4 text-[14px] ${
            result.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-amber-300 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          <p className="font-extrabold">{result.ok ? "OK" : "Ошибка"}</p>
          <p className="mt-2">{result.message}</p>
          {result.reply ? (
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 font-mono text-[15px]">
              Ответ модели: {result.reply}
            </p>
          ) : null}
          {result.error ? <p className="mt-2 break-words">{result.error}</p> : null}
          <ul className="mt-3 space-y-1 font-mono text-[13px]">
            <li>{`OPENAI_API_KEY: ${result.env.hasApiKey ? "задан" : "нет"}`}</li>
            <li>{`OPENAI_BASE_URL: ${result.env.hasBaseUrl ? result.env.baseUrlHost ?? "задан" : "по умолчанию api.openai.com"}`}</li>
            <li>{`OPENAI_RELAY_SECRET: ${result.env.hasRelaySecret ? "задан" : "нет"}`}</li>
            <li>{`Модель: ${result.env.model}`}</li>
            {result.httpStatus != null ? <li>{`HTTP: ${result.httpStatus}`}</li> : null}
            {result.durationMs != null ? <li>{`Время: ${result.durationMs} мс`}</li> : null}
            {result.hint ? <li>{`Подсказка: ${result.hint}`}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
