"use client";

import React from "react";

import { AdminSelectCheckbox } from "@/components/admin/AdminSelectCheckbox";

export type AdminBulkSelectionBarProps = {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  busy?: boolean;
  children?: React.ReactNode;
};

/**
 * Панель «выбрать все» и массовых действий над списком.
 * При выборе — плавающая тёмная панель по макету.
 */
export function AdminBulkSelectionBar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onClear,
  busy = false,
  children,
}: AdminBulkSelectionBarProps): React.ReactElement | null {
  if (totalCount === 0) {
    return null;
  }

  const indeterminate = selectedCount > 0 && !allSelected;

  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-3 px-1 py-2">
        <AdminSelectCheckbox
          checked={allSelected}
          indeterminate={indeterminate}
          disabled={busy}
          onChange={onToggleAll}
          label="Выбрать все"
        />
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 z-30 flex w-[min(640px,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center gap-3 rounded-[16px] bg-[var(--admin-dark)] px-5 py-4 text-white shadow-[var(--admin-shadow-float)]"
      role="toolbar"
      aria-label="Массовые действия"
    >
      <AdminSelectCheckbox
        checked={allSelected}
        indeterminate={indeterminate}
        disabled={busy}
        onChange={onToggleAll}
        label="Выбрать все"
        tone="onDark"
      />
      <span className="text-[14px] font-semibold">Выбрано: {String(selectedCount)}</span>
      <div className="flex flex-1 flex-wrap gap-2">{children}</div>
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        className="text-[13px] font-semibold text-[var(--admin-danger-on-dark)] hover:underline disabled:opacity-50"
      >
        Снять
      </button>
    </div>
  );
}

export type AdminBulkActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

/**
 * Кнопка массового действия на панели выбора.
 */
export function AdminBulkActionButton({
  label,
  onClick,
  disabled = false,
  variant = "secondary",
}: AdminBulkActionButtonProps): React.ReactElement {
  const className =
    variant === "danger"
      ? "rounded-full bg-[var(--admin-danger)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
      : variant === "primary"
        ? "rounded-full bg-[var(--admin-accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--admin-accent-hover)] disabled:opacity-50"
        : "rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/25 disabled:opacity-50";

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {label}
    </button>
  );
}
