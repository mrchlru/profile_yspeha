"use client";

import React from "react";

import {
  adminBadgeAdminOnlyClass,
  adminPanelCardClass,
  adminSettingsGroupTitleClass,
} from "@/lib/admin/adminPanelTheme";

export type AdminSettingsGroupProps = {
  title: string;
  adminOnly?: boolean;
  children: React.ReactNode;
};

/**
 * Заголовок группы и белая карточка со строками настроек.
 */
export function AdminSettingsGroup({
  title,
  adminOnly = false,
  children,
}: AdminSettingsGroupProps): React.ReactElement {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={adminSettingsGroupTitleClass}>{title}</h2>
        {adminOnly ? <span className={adminBadgeAdminOnlyClass}>Только администратор</span> : null}
      </div>
      <div
        className={`overflow-hidden divide-y divide-[var(--admin-hairline)] ${adminPanelCardClass}`}
      >
        {children}
      </div>
    </section>
  );
}
