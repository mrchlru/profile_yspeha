"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { AdminListSwitchRow } from "@/components/admin/ui/AdminUi";
import {
  adminFieldLabelClass,
  adminInputClass,
  adminPanelMutedTextClass,
  adminPrimaryButtonClass,
} from "@/lib/admin/adminPanelTheme";

type NotificationSettingsResponse = {
  notifyAdmin: boolean;
  notifyHrd: boolean;
  notifyExtraEmailsRaw: string;
  updatedAt: string | null;
};

export type NotificationSettingsFormProps = {
  embedded?: boolean;
  onSaved?: () => void;
};

/**
 * Настройки email-уведомлений о критическом ПИ (только для администратора).
 */
export function NotificationSettingsForm({
  onSaved,
}: NotificationSettingsFormProps): React.ReactElement {
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [notifyHrd, setNotifyHrd] = useState(true);
  const [notifyExtraEmailsRaw, setNotifyExtraEmailsRaw] = useState("");
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
      <p className={`text-[13px] ${adminPanelMutedTextClass}`}>
        Письма уходят при ПИ ≥ 40 с рекомендацией теста Маслач. Напоминания о повторном тесте — через
        3 месяца, автоматически.
      </p>

      <div className="overflow-hidden rounded-xl ring-1 ring-[var(--admin-hairline)]">
        <AdminListSwitchRow
          title="Главный администратор"
          checked={notifyAdmin}
          onChange={setNotifyAdmin}
        />
        <AdminListSwitchRow title="HrD" checked={notifyHrd} onChange={setNotifyHrd} />
      </div>

      <div>
        <label htmlFor="pi-notify-extra-emails" className={adminFieldLabelClass}>
          Дополнительные получатели
        </label>
        <textarea
          id="pi-notify-extra-emails"
          rows={4}
          value={notifyExtraEmailsRaw}
          onChange={(event) => setNotifyExtraEmailsRaw(event.target.value)}
          className={`${adminInputClass} min-h-[120px] py-3`}
          placeholder="name@company.ru"
          spellCheck={false}
          autoComplete="off"
        />
        <p className={`mt-1.5 text-[13px] ${adminPanelMutedTextClass}`}>
          Адреса через запятую или с новой строки
        </p>
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
        <Button type="button" disabled={busy} onClick={() => void saveSettings()} className={adminPrimaryButtonClass}>
          {busy ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
