"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import {
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";

type NotificationSettingsResponse = {
  notifyAdmin: boolean;
  notifyHrd: boolean;
  notifyExtraEmailsRaw: string;
  updatedAt: string | null;
};

/**
 * Настройки email-уведомлений о критическом ПИ (только для администратора).
 */
export function NotificationSettingsForm(): React.ReactElement {
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [notifyHrd, setNotifyHrd] = useState(true);
  const [notifyExtraEmailsRaw, setNotifyExtraEmailsRaw] = useState("");
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
      const res = await fetch("/api/admin/settings/notifications", { cache: "no-store" });
      const body = (await res.json()) as NotificationSettingsResponse & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось загрузить настройки.");
        return;
      }
      setNotifyAdmin(body.notifyAdmin);
      setNotifyHrd(body.notifyHrd);
      setNotifyExtraEmailsRaw(body.notifyExtraEmailsRaw ?? "");
      setUpdatedAt(body.updatedAt);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(): Promise<void> {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyAdmin, notifyHrd, notifyExtraEmailsRaw }),
      });
      const body = (await res.json()) as NotificationSettingsResponse & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось сохранить настройки.");
        return;
      }
      setNotifyAdmin(body.notifyAdmin);
      setNotifyHrd(body.notifyHrd);
      setNotifyExtraEmailsRaw(body.notifyExtraEmailsRaw ?? "");
      setUpdatedAt(body.updatedAt);
      setSuccess("Настройки уведомлений сохранены.");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className={stepSecondaryTextClass}>Загрузка уведомлений…</p>;
  }

  return (
    <div className={`max-w-[640px] space-y-5 px-6 py-6 ${stepSurfaceCardClass}`}>
      <div>
        <h2 className="text-[20px] font-extrabold text-[#5F5E5E]">Уведомления о выгорании</h2>
        <p className={`mt-2 ${stepSecondaryTextClass}`}>
          При показателе психоэмоционального истощения (ПИ) 40 баллов и выше в отчёте значение
          выделяется красным. Дополнительно можно отправлять письма администратору и HrD с
          рекомендацией назначить тест на выгорание (Маслач).
        </p>
        <p className={`mt-2 ${stepSecondaryTextClass}`}>
          Напоминания о повторном тесте через 3 месяца отправляются автоматически при работе
          в админ-панели (раздел «Результаты»), при назначении теста и после его прохождения.
          Внешний cron не обязателен.
        </p>
        <p className={`mt-2 text-[13px] ${stepSecondaryTextClass}`}>
          Опционально: можно настроить ежедневный вызов{" "}
          <code>/api/cron/burnout-reminders</code> с заголовком{" "}
          <code>Authorization: Bearer CRON_SECRET</code>, чтобы письма уходили даже если в
          админку долго никто не заходил.
        </p>
        {updatedAt ? (
          <p className="mt-2 text-[14px] text-[#007A68]">
            Обновлено: {formatMoscowDateTime(updatedAt)}
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded border-black/20"
          checked={notifyAdmin}
          onChange={(event) => setNotifyAdmin(event.target.checked)}
        />
        <span className={stepSecondaryTextClass}>
          Уведомлять главного администратора (почта из <code>ADMIN_PANEL_EMAIL</code>)
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded border-black/20"
          checked={notifyHrd}
          onChange={(event) => setNotifyHrd(event.target.checked)}
        />
        <span className={stepSecondaryTextClass}>
          Уведомлять HrD (почта из настроек доступа HrD)
        </span>
      </label>

      <div className="space-y-2">
        <label
          htmlFor="pi-notify-extra-emails"
          className="block text-[14px] font-bold text-[#5F5E5E]"
        >
          Дополнительные получатели (как HrD)
        </label>
        <p className={stepSecondaryTextClass}>
          Письма о критическом ПИ (40 баллов и выше) с рекомендацией теста Маслач. Укажите адреса
          через запятую или с новой строки.
        </p>
        <textarea
          id="pi-notify-extra-emails"
          rows={4}
          value={notifyExtraEmailsRaw}
          onChange={(event) => setNotifyExtraEmailsRaw(event.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-[14px] text-[#5F5E5E] outline-none ring-[#00B596] focus:ring-2"
          placeholder={"hr.partner@company.ru\nsecurity@company.ru"}
          spellCheck={false}
          autoComplete="off"
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
        disabled={busy}
        onClick={() => void saveSettings()}
        className={stepNavPrimaryButtonClass}
      >
        {busy ? "Сохранение…" : "Сохранить уведомления"}
      </Button>
    </div>
  );
}
