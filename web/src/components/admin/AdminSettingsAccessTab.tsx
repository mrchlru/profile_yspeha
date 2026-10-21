"use client";

import React, { useCallback, useEffect, useState } from "react";

import {
  GoogleSheetsTestPanel,
  MyCredentialsForm,
  OpenAiTestPanel,
} from "@/components/admin/AdminSettingsPanels";
import { AdminSettingsRow } from "@/components/admin/AdminSettingsRow";
import { AdminSettingsSheet } from "@/components/admin/AdminSettingsSheet";
import { DataMigrationPanel } from "@/components/admin/DataMigrationPanel";
import { HrdSettingsForm } from "@/components/admin/HrdSettingsForm";
import { NotificationSettingsForm } from "@/components/admin/NotificationSettingsForm";
import { RegenerateManagerBriefPanel } from "@/components/admin/RegenerateManagerBriefPanel";
import { RegenerateReportsPanel } from "@/components/admin/RegenerateReportsPanel";
import { RegenerateScreeningAiPanel } from "@/components/admin/RegenerateScreeningAiPanel";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { ADMIN_TIMEWEB_LOGS_HREF } from "@/lib/admin/adminNav";
import { AdminSettingsGroup } from "@/components/admin/AdminSettingsGroup";
import { formatAdminDateTimeShort } from "@/lib/datetime/adminDateFormat";
import type { AdminStatusChipTone } from "@/components/admin/ui/AdminUi";
import { useAdminSession } from "@/hooks/useAdminSession";

type SheetId =
  | "hrd"
  | "my-credentials"
  | "notifications"
  | "openai"
  | "google"
  | "migration"
  | "regen-screening"
  | "regen-brief"
  | "regen-reports"
  | null;

type HrdSummary = {
  configured: boolean;
  email: string | null;
  updatedAt: string | null;
};

type NotificationsSummary = {
  notifyAdmin: boolean;
  notifyHrd: boolean;
  notifyExtraEmailsRaw: string;
};

/**
 * Вкладка «Доступ»: группы и строки по TZ_SETTINGS.
 */
export function AdminSettingsAccessTab(): React.ReactElement {
  const { session } = useAdminSession();
  const isAdmin = session.status === "authenticated" && session.role === ADMIN_ROLE_ADMIN;
  const [sheet, setSheet] = useState<SheetId>(null);
  const [hrd, setHrd] = useState<HrdSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationsSummary | null>(null);
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean | null>(null);
  const [openAiOk, setOpenAiOk] = useState<boolean | null>(null);
  const [googleOk, setGoogleOk] = useState<boolean | null>(null);

  const loadSummaries = useCallback(async (): Promise<void> => {
    if (!isAdmin) {
      return;
    }
    try {
      const [hrdRes, notifRes, openAiRes, googleRes] = await Promise.all([
        fetch("/api/admin/settings/hrd", { cache: "no-store" }),
        fetch("/api/admin/settings/notifications", { cache: "no-store" }),
        fetch("/api/admin/openai/test", { cache: "no-store" }),
        fetch("/api/admin/google-sheets/test", { cache: "no-store" }),
      ]);
      if (hrdRes.ok) {
        const body = (await hrdRes.json()) as HrdSummary;
        setHrd(body);
      }
      if (notifRes.ok) {
        const body = (await notifRes.json()) as NotificationsSummary;
        setNotifications(body);
      }
      if (openAiRes.ok) {
        const body = (await openAiRes.json()) as { configured?: boolean; ok?: boolean };
        setOpenAiConfigured(body.configured ?? false);
        setOpenAiOk(body.ok ?? body.configured ?? false);
      }
      if (googleRes.ok) {
        const body = (await googleRes.json()) as { ok?: boolean };
        setGoogleOk(body.ok === true);
      } else {
        setGoogleOk(false);
      }
    } catch {
      setOpenAiConfigured(null);
      setGoogleOk(null);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  if (session.status !== "authenticated") {
    return <p className="text-[14px] text-[var(--admin-text-3)]">Загрузка…</p>;
  }

  const notificationsOn =
    notifications &&
    (notifications.notifyAdmin ||
      notifications.notifyHrd ||
      notifications.notifyExtraEmailsRaw.trim().length > 0);

  const openAiStatus = _connectionStatus(
    openAiConfigured === false ? false : openAiOk,
    openAiConfigured === null
  );
  const googleStatus = _connectionStatus(googleOk, googleOk === null);

  return (
    <>
      <div className="space-y-8">
        <AdminSettingsGroup title="Учётные записи">
          {isAdmin ? (
            <AdminSettingsRow
              title="Администратор"
              subtitle={session.email}
              statusLabel="Задаётся на сервере"
              statusTone="neutral"
            />
          ) : (
            <AdminSettingsRow
              title="Мой доступ"
              subtitle={session.email}
              statusLabel="Изменить"
              statusTone="info"
              onClick={() => setSheet("my-credentials")}
            />
          )}
          {isAdmin ? (
            <AdminSettingsRow
              title="HrD"
              subtitle={hrd?.email ?? "Почта не задана"}
              statusLabel={
                hrd?.updatedAt
                  ? `Обновлено ${formatAdminDateTimeShort(hrd.updatedAt)}`
                  : hrd?.configured
                    ? "Настроено"
                    : "Не создан"
              }
              statusTone={hrd?.configured ? "ok" : "warn"}
              onClick={() => setSheet("hrd")}
            />
          ) : null}
        </AdminSettingsGroup>

        {isAdmin ? (
          <AdminSettingsGroup title="Уведомления">
            <AdminSettingsRow
              title="Выгорание (ПИ ≥ 40)"
              subtitle="Письма с рекомендацией теста Маслач"
              statusLabel={notificationsOn ? "Вкл" : "Выкл"}
              statusTone={notificationsOn ? "ok" : "neutral"}
              onClick={() => setSheet("notifications")}
            />
          </AdminSettingsGroup>
        ) : null}

        {isAdmin ? (
          <AdminSettingsGroup title="Интеграции" adminOnly>
            <AdminSettingsRow
              title="OpenAI"
              subtitle="Заключения и отчёты"
              statusLabel={openAiStatus.label}
              statusTone={openAiStatus.tone}
              onClick={() => setSheet("openai")}
            />
            <AdminSettingsRow
              title="Google Таблицы"
              subtitle="Выгрузка результатов"
              statusLabel={googleStatus.label}
              statusTone={googleStatus.tone}
              onClick={() => setSheet("google")}
            />
          </AdminSettingsGroup>
        ) : null}

        {isAdmin ? (
          <AdminSettingsGroup title="Перегенерация ИИ" adminOnly>
            <AdminSettingsRow
              title="Заключения скринингов"
              subtitle="Для отчётов без заключения"
              onClick={() => setSheet("regen-screening")}
            />
            <AdminSettingsRow
              title="Заключения для руководителей"
              subtitle="ОД и ТУ"
              onClick={() => setSheet("regen-brief")}
            />
            <AdminSettingsRow
              title="Пересборка отчётов"
              subtitle="По текущим шаблонам"
              onClick={() => setSheet("regen-reports")}
            />
          </AdminSettingsGroup>
        ) : null}

        {isAdmin ? (
          <AdminSettingsGroup title="Сервис" adminOnly>
            <AdminSettingsRow
              title="Логи Timeweb"
              subtitle="Статус, деплои, журнал"
              href={ADMIN_TIMEWEB_LOGS_HREF}
            />
            <AdminSettingsRow
              title="Миграция данных"
              subtitle="Перенос между серверами"
              onClick={() => setSheet("migration")}
            />
          </AdminSettingsGroup>
        ) : null}
      </div>

      <AdminSettingsSheet
        open={sheet === "hrd"}
        title="Доступ HrD"
        onClose={() => setSheet(null)}
      >
        <HrdSettingsForm embedded onSaved={() => void loadSummaries()} />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "my-credentials"}
        title="Мой доступ"
        onClose={() => setSheet(null)}
      >
        <MyCredentialsForm embedded />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "notifications"}
        title="Уведомления"
        onClose={() => setSheet(null)}
      >
        <NotificationSettingsForm embedded onSaved={() => void loadSummaries()} />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "openai"}
        title="OpenAI"
        onClose={() => setSheet(null)}
      >
        <OpenAiTestPanel
          embedded
          onStatusChange={(ok, configured) => {
            setOpenAiOk(ok);
            setOpenAiConfigured(configured);
          }}
        />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "google"}
        title="Google Таблицы"
        onClose={() => setSheet(null)}
      >
        <GoogleSheetsTestPanel embedded onStatusChange={(ok) => setGoogleOk(ok)} />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "migration"}
        title="Миграция данных"
        onClose={() => setSheet(null)}
      >
        <DataMigrationPanel embedded />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "regen-screening"}
        title="Заключения скринингов"
        onClose={() => setSheet(null)}
      >
        <RegenerateScreeningAiPanel embedded />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "regen-brief"}
        title="Заключения для руководителей"
        onClose={() => setSheet(null)}
      >
        <RegenerateManagerBriefPanel embedded />
      </AdminSettingsSheet>

      <AdminSettingsSheet
        open={sheet === "regen-reports"}
        title="Пересборка отчётов"
        onClose={() => setSheet(null)}
      >
        <RegenerateReportsPanel embedded />
      </AdminSettingsSheet>
    </>
  );
}

function _connectionStatus(
  ok: boolean | null,
  loading: boolean
): { label: string; tone: AdminStatusChipTone } {
  if (loading) {
    return { label: "…", tone: "neutral" };
  }
  if (ok === true) {
    return { label: "Подключено", tone: "ok" };
  }
  if (ok === false) {
    return { label: "Не подключено", tone: "warn" };
  }
  return { label: "Ошибка", tone: "danger" };
}
