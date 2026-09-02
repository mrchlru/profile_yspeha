"use client";

import React, { useState } from "react";

import {
  AdminCredentialsNotice,
  GoogleSheetsTestPanel,
  MyCredentialsForm,
  OpenAiTestPanel,
} from "@/components/admin/AdminSettingsPanels";
import { RegenerateManagerBriefPanel } from "@/components/admin/RegenerateManagerBriefPanel";
import { RegenerateReportsPanel } from "@/components/admin/RegenerateReportsPanel";
import { CommissionEvalLogsPanel } from "@/components/admin/CommissionEvalLogsPanel";
import { CommissionQuestionsPanel } from "@/components/admin/CommissionQuestionsPanel";
import { HrdSettingsForm } from "@/components/admin/HrdSettingsForm";
import { NotificationSettingsForm } from "@/components/admin/NotificationSettingsForm";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { useAdminSession } from "@/hooks/useAdminSession";

type SettingsTab = "access" | "commission" | "logs";

/**
 * Содержимое раздела «Настройки» с подразделами.
 */
export function AdminSettingsContent(): React.ReactElement {
  const { session } = useAdminSession();
  const [tab, setTab] = useState<SettingsTab>("access");

  if (session.status !== "authenticated") {
    return <p>Загрузка…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <SettingsTabButton
          active={tab === "access"}
          onClick={() => setTab("access")}
          label="Доступ"
        />
        <SettingsTabButton
          active={tab === "commission"}
          onClick={() => setTab("commission")}
          label="Вопросы комиссии"
        />
        {session.role === ADMIN_ROLE_ADMIN ? (
          <SettingsTabButton
            active={tab === "logs"}
            onClick={() => setTab("logs")}
            label="Логи"
          />
        ) : null}
      </div>

      {tab === "access" ? (
        <div className="space-y-6">
          {session.role === ADMIN_ROLE_ADMIN ? (
            <AdminCredentialsNotice />
          ) : (
            <MyCredentialsForm />
          )}
          {session.role === ADMIN_ROLE_ADMIN ? <HrdSettingsForm /> : null}
          {session.role === ADMIN_ROLE_ADMIN ? <NotificationSettingsForm /> : null}
          {session.role === ADMIN_ROLE_ADMIN ? <OpenAiTestPanel /> : null}
          {session.role === ADMIN_ROLE_ADMIN ? <GoogleSheetsTestPanel /> : null}
          {session.role === ADMIN_ROLE_ADMIN ? <RegenerateManagerBriefPanel /> : null}
          {session.role === ADMIN_ROLE_ADMIN ? <RegenerateReportsPanel /> : null}
        </div>
      ) : tab === "commission" ? (
        <CommissionQuestionsPanel />
      ) : (
        <CommissionEvalLogsPanel />
      )}
    </div>
  );
}

type SettingsTabButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
};

function SettingsTabButton({
  active,
  onClick,
  label,
}: SettingsTabButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-[14px] font-bold transition ${
        active ? "bg-[#00B596] text-white" : "bg-[#DDDDDD] text-[#5F5E5E] hover:bg-white/70"
      }`}
    >
      {label}
    </button>
  );
}
