"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { Button } from "@/components/Button";
import { AdminSettingsIcon } from "@/components/admin/AdminIconButton";
import { AdminNavIcon } from "@/components/admin/AdminNavIcons";
import {
  ADMIN_SETTINGS_HREF,
  adminSidebarNavItemsForRole,
  canAccessAdminSettings,
  isAdminNavItemActive,
} from "@/lib/admin/adminNav";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/adminRoles";
import { useAdminSession, clearAdminSessionCache } from "@/hooks/useAdminSession";
import {
  stepSecondaryTextClass,
  stepSectionTitleClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";

export type AdminShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
};

/**
 * Оболочка админ-панели DriveS: боковое меню, шапка и выход.
 */
export function AdminShell({
  children,
  title,
  description,
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
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] text-[#5F5E5E]">
        Загрузка…
      </div>
    );
  }

  const navItems = adminSidebarNavItemsForRole(session.role);
  const settingsActive = isAdminNavItemActive(pathname, ADMIN_SETTINGS_HREF);
  const showSettingsLink = canAccessAdminSettings(session.role);

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#4F4F4F]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <aside
          className={`sticky top-0 hidden h-screen w-[260px] shrink-0 self-start flex-col justify-between overflow-y-auto border-r border-black/10 bg-[#DDDDDD] p-6 lg:flex ${stepSurfaceCardClass} !rounded-none !shadow-none`}
        >
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#8C8C8C]">
              DriveS
            </p>
            <p className="mt-1 text-[22px] font-extrabold text-[#5F5E5E]">Админ-панель</p>
            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const active = isAdminNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-[15px] font-bold transition ${
                      active
                        ? "bg-[#00B596]/15 text-[#007A68]"
                        : "text-[#5F5E5E] hover:bg-white/50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                        active ? "bg-white/90 text-[#007A68]" : "bg-white/70 text-[#8C8C8C]"
                      }`}
                    >
                      <AdminNavIcon iconId={item.iconId} />
                    </span>
                    <span className="leading-snug">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <AdminProfileCard
            email={session.email}
            roleLabel={ADMIN_ROLE_LABELS[session.role]}
            showSettingsLink={showSettingsLink}
            settingsActive={settingsActive}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white/70 px-5 py-4 sm:px-8">
            <div>
              <h1 className={`${stepSectionTitleClass} !mb-1 !text-[24px] sm:!text-[28px]`}>
                {title}
              </h1>
              {description ? (
                <p className={`${stepSecondaryTextClass} !text-[14px]`}>{description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AdminProfileCard
                email={session.email}
                roleLabel={session.roleLabel}
                showSettingsLink={showSettingsLink}
                settingsActive={settingsActive}
                compact
              />
              <Button type="button" variant="secondary" onClick={() => void logout()}>
                Выйти
              </Button>
            </div>
          </header>

          <div className="flex flex-wrap gap-2 border-b border-black/5 bg-white/40 px-5 py-3 lg:hidden">
            {navItems.map((item) => {
              const active = isAdminNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold ${
                    active ? "bg-[#00B596] text-white" : "bg-[#DDDDDD] text-[#5F5E5E]"
                  }`}
                >
                  <AdminNavIcon iconId={item.iconId} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

type AdminProfileCardProps = {
  email: string;
  roleLabel: string;
  showSettingsLink: boolean;
  settingsActive: boolean;
  /** Компактный вид в шапке на телефонах. */
  compact?: boolean;
};

function AdminProfileCard({
  email,
  roleLabel,
  showSettingsLink,
  settingsActive,
  compact = false,
}: AdminProfileCardProps): React.ReactElement {
  return (
    <div
      className={`relative text-[13px] leading-snug text-[#5F5E5E] ${
        compact
          ? "rounded-2xl bg-[#DDDDDD] px-4 py-2 pr-10 lg:hidden"
          : "rounded-2xl bg-white/50 px-4 py-3 pr-10"
      }`}
    >
      <p className={`font-extrabold ${compact ? "truncate" : "break-all"}`}>{email}</p>
      <p className="mt-1">{roleLabel}</p>
      {showSettingsLink ? (
        <Link
          href={ADMIN_SETTINGS_HREF}
          aria-label="Настройки"
          title="Настройки"
          className={`absolute bottom-2 right-2 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] transition [&_svg]:h-4 [&_svg]:w-4 ${
            settingsActive
              ? "bg-[#00B596]/15 text-[#007A68]"
              : "text-[#8C8C8C] hover:bg-white"
          }`}
        >
          <AdminSettingsIcon />
        </Link>
      ) : null}
    </div>
  );
}
