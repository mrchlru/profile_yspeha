"use client";

import React, { useState } from "react";

import {
  AdminCredentialsNotice,
  GoogleSheetsTestPanel,
  MyCredentialsForm,
  OpenAiTestPanel,
} from "@/components/admin/AdminSettingsPanels";
import { DataMigrationPanel } from "@/components/admin/DataMigrationPanel";
import { RegenerateManagerBriefPanel } from "@/components/admin/RegenerateManagerBriefPanel";
import { RegenerateReportsPanel } from "@/components/admin/RegenerateReportsPanel";
import { RegenerateScreeningAiPanel } from "@/components/admin/RegenerateScreeningAiPanel";
import { CommissionEvalLogsPanel } from "@/components/admin/CommissionEvalLogsPanel";
import { CommissionQuestionsPanel } from "@/components/admin/CommissionQuestionsPanel";
import { HrdSettingsForm } from "@/components/admin/HrdSettingsForm";
import { NotificationSettingsForm } from "@/components/admin/NotificationSettingsForm";
import { AdminSegmentControl } from "@/components/admin/ui/AdminUi";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  adminBadgeSoonClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";

type SettingsTab = "access" | "commission" | "logs";

/**
 * Содержимое раздела «Настройки» с подразделами.
 */
export function AdminSettingsContent(): React.ReactElement {
  const { session } = useAdminSession();
  const [tab, setTab] = useState<SettingsTab>("access");

  if (session.status !== "authenticated") {
    return <p className={adminPanelMutedTextClass}>Загрузка…</p>;
  }

  const tabOptions: ReadonlyArray<{ value: SettingsTab; label: string }> = [
    { value: "access", label: "Доступ" },
    { value: "commission", label: "Вопросы комиссии" },
    ...(session.role === ADMIN_ROLE_ADMIN ? [{ value: "logs" as const, label: "Логи" }] : []),
  ];

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <AdminSegmentControl
        ariaLabel="Разделы настроек"
        options={tabOptions}
        value={tab}
        onChange={setTab}
      />

      {tab === "access" ? (
        <div className="space-y-8">
          <SettingsGroup title="Учётные записи">
            {session.role === ADMIN_ROLE_ADMIN ? (
              <AdminCredentialsNotice />
            ) : (
              <MyCredentialsForm />
            )}
            {session.role === ADMIN_ROLE_ADMIN ? <HrdSettingsForm /> : null}
          </SettingsGroup>

          {session.role === ADMIN_ROLE_ADMIN ? (
            <SettingsGroup title="Интеграции" adminOnly>
              <NotificationSettingsForm />
              <OpenAiTestPanel />
              <GoogleSheetsTestPanel />
            </SettingsGroup>
          ) : null}

          {session.role === ADMIN_ROLE_ADMIN ? (
            <SettingsGroup title="Перегенерация ИИ" adminOnly>
              <RegenerateScreeningAiPanel />
              <RegenerateManagerBriefPanel />
              <RegenerateReportsPanel />
            </SettingsGroup>
          ) : null}

          {session.role === ADMIN_ROLE_ADMIN ? (
            <SettingsGroup title="Сервис" adminOnly>
              <DataMigrationPanel />
            </SettingsGroup>
          ) : null}
        </div>
      ) : tab === "commission" ? (
        <CommissionQuestionsPanel />
      ) : (
        <CommissionEvalLogsPanel />
      )}
    </div>
  );
}

type SettingsGroupProps = {
  title: string;
  adminOnly?: boolean;
  children: React.ReactNode;
};

function SettingsGroup({ title, adminOnly = false, children }: SettingsGroupProps): React.ReactElement {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={adminPanelSectionTitleClass}>{title}</h2>
        {adminOnly ? <span className={adminBadgeSoonClass}>Только администратор</span> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
