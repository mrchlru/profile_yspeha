"use client";

import Link from "next/link";
import React from "react";

import { AdminStatusChip, type AdminStatusChipTone } from "@/components/admin/ui/AdminUi";

export type AdminSettingsRowProps = {
  title: string;
  subtitle: string;
  statusLabel?: string;
  statusTone?: AdminStatusChipTone;
  href?: string;
  onClick?: () => void;
};

/**
 * Строка сгруппированного списка настроек.
 */
export function AdminSettingsRow({
  title,
  subtitle,
  statusLabel,
  statusTone = "neutral",
  href,
  onClick,
}: AdminSettingsRowProps): React.ReactElement {
  const content = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[16px] font-medium text-[var(--admin-text)]">{title}</p>
        <p className="truncate text-[14px] text-[var(--admin-text-3)]">{subtitle}</p>
      </div>
      {statusLabel ? (
        <AdminStatusChip label={statusLabel} tone={statusTone} />
      ) : (
        <span className="w-2 shrink-0" aria-hidden />
      )}
      <span className="shrink-0 text-[var(--admin-chevron)]" aria-hidden>
        ›
      </span>
    </>
  );

  const className =
    "flex w-full items-center gap-3 px-4 py-4 transition hover:bg-[var(--admin-accent-tint-2)] sm:px-5";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
