"use client";

import React, { useState } from "react";

import { AdminSettingsAccessTab } from "@/components/admin/AdminSettingsAccessTab";
import { CommissionEvalLogsPanel } from "@/components/admin/CommissionEvalLogsPanel";
import { CommissionQuestionsPanel } from "@/components/admin/CommissionQuestionsPanel";
import { AdminSegmentControl } from "@/components/admin/ui/AdminUi";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";

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

  const tabPanelPrefix = "admin-settings";

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <AdminSegmentControl
        ariaLabel="Разделы настроек"
        options={tabOptions}
        value={tab}
        onChange={setTab}
        tabPanelIdPrefix={tabPanelPrefix}
      />

      <div
        id={`${tabPanelPrefix}-panel-access`}
        role="tabpanel"
        aria-labelledby={`${tabPanelPrefix}-tab-access`}
        hidden={tab !== "access"}
        className={tab === "access" ? undefined : "hidden"}
      >
        {tab === "access" ? <AdminSettingsAccessTab /> : null}
      </div>
      <div
        id={`${tabPanelPrefix}-panel-commission`}
        role="tabpanel"
        aria-labelledby={`${tabPanelPrefix}-tab-commission`}
        hidden={tab !== "commission"}
        className={tab === "commission" ? undefined : "hidden"}
      >
        {tab === "commission" ? <CommissionQuestionsPanel /> : null}
      </div>
      <div
        id={`${tabPanelPrefix}-panel-logs`}
        role="tabpanel"
        aria-labelledby={`${tabPanelPrefix}-tab-logs`}
        hidden={tab !== "logs"}
        className={tab === "logs" ? undefined : "hidden"}
      >
        {tab === "logs" ? <CommissionEvalLogsPanel /> : null}
      </div>
    </div>
  );
}
