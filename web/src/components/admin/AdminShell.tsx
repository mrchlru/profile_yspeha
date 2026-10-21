"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { AdminSettingsIcon } from "@/components/admin/AdminIconButton";
import { AdminNavIcon } from "@/components/admin/AdminNavIcons";
import {
  ADMIN_SETTINGS_HREF,
  adminMobileNavItemsForRole,
  adminSidebarNavItemsForRole,
  canAccessAdminSettings,
  isAdminNavItemActive,
} from "@/lib/admin/adminNav";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/adminRoles";
import { useAdminSession, clearAdminSessionCache } from "@/hooks/useAdminSession";
import { adminPageTitleClass, adminSecondaryButtonClass } from "@/lib/admin/adminPanelTheme";

export type AdminShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  /** Иконки и действия справа в шапке (до «Выйти»). */
  headerActions?: React.ReactNode;
};

/**
 * Оболочка админ-панели DriveS: боковое меню, шапка и выход.
 */
export function AdminShell({
  children,
  title,
  headerActions,
}: AdminShellProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAdminSession();

  useEffect(() => {
    if (session.status === "guest") {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/admin/login${next}`);
    }
  }, [session.status, pathname, router]);

  async function logout(): Promise<void> {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    clearAdminSessionCache();
    router.replace("/admin/login");
  }

  if (session.status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--admin-bg)] text-[var(--admin-text-3)]">
        Загрузка…
      </div>
    );
  }

  const navItems = adminSidebarNavItemsForRole(session.role);
  const mobileNavItems = adminMobileNavItemsForRole(session.role);
  const settingsActive = isAdminNavItemActive(pathname, ADMIN_SETTINGS_HREF);
  const showSettingsLink = canAccessAdminSettings(session.role);
  const initials = adminEmailInitials(session.email);

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[var(--admin-hairline)] bg-[var(--admin-surface)] px-4 py-6 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-[var(--admin-accent)] text-[18px] font-bold text-white">
              D
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[var(--admin-text)]">DriveS</p>
              <p className="text-[12px] font-medium text-[var(--admin-text-3)]">Админ-панель</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Разделы">
            {navItems.map((item) => {
              const active = isAdminNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] transition ${
                    active
                      ? "bg-[var(--admin-surface)] font-semibold text-[var(--admin-accent)] shadow-[var(--admin-shadow-nav-active)]"
                      : "font-medium text-[var(--admin-text-2)] hover:bg-[var(--admin-surface-muted)]"
                  }`}
                >
                  <span
                    className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] ${
                      active
                        ? "bg-[var(--admin-accent-tint)] text-[var(--admin-accent)]"
                        : "text-[var(--admin-text-3)]"
                    }`}
                  >
                    <AdminNavIcon iconId={item.iconId} />
                  </span>
                  <span className="leading-snug">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <AdminSidebarProfile
            email={session.email}
            roleLabel={ADMIN_ROLE_LABELS[session.role]}
            initials={initials}
            showSettingsLink={showSettingsLink}
            settingsActive={settingsActive}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="px-5 py-5 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                {title ? <h1 className={adminPageTitleClass}>{title}</h1> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={() => void logout()}
                  className={adminSecondaryButtonClass}
                >
                  Выйти
                </button>
              </div>
            </div>
          </header>

          <div
            className="flex gap-2 overflow-x-auto border-b border-[var(--admin-hairline)] px-4 py-3 lg:hidden"
            aria-label="Разделы"
          >
            {mobileNavItems.map((item) => {
              const active = isAdminNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ${
                    active
                      ? "bg-[var(--admin-accent)] text-white"
                      : "bg-[var(--admin-surface)] text-[var(--admin-text-2)] shadow-[var(--admin-shadow-card)]"
                  }`}
                >
                  <AdminNavIcon iconId={item.iconId} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-12">{children}</main>
        </div>
      </div>
    </div>
  );
}

type AdminSidebarProfileProps = {
  email: string;
  roleLabel: string;
  initials: string;
  showSettingsLink: boolean;
  settingsActive: boolean;
};

function AdminSidebarProfile({
  email,
  roleLabel,
  initials,
  showSettingsLink,
  settingsActive,
}: AdminSidebarProfileProps): React.ReactElement {
  return (
    <div className="mt-4 rounded-[14px] bg-[var(--admin-surface-muted)] p-3 pr-2">
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-avatar-bg-side)] text-[13px] font-semibold text-[var(--admin-accent)]">
          {initials}
        </span>
        <div className="min-w-0 flex-1 pr-1">
          <p className="truncate text-[14px] font-semibold leading-tight text-[var(--admin-text)]">
            {roleLabel}
          </p>
          <p className="truncate text-[12px] text-[var(--admin-text-3)]">{email}</p>
        </div>
        {showSettingsLink ? (
          <Link
            href={ADMIN_SETTINGS_HREF}
            aria-label="Настройки"
            title="Настройки"
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full transition [&_svg]:size-4 ${
              settingsActive
                ? "bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-[var(--admin-shadow-card)]"
                : "text-[var(--admin-text-3)] hover:bg-[var(--admin-surface)]"
            }`}
          >
            <AdminSettingsIcon />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function adminEmailInitials(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  return local.slice(0, 1).toUpperCase() || "?";
}
