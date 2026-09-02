"use client";

import React from "react";

import { Button } from "@/components/Button";
import { AdminSelectCheckbox } from "@/components/admin/AdminSelectCheckbox";
import { adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";

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

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
      <AdminSelectCheckbox
        checked={allSelected}
        indeterminate={indeterminate}
        disabled={busy}
        onChange={onToggleAll}
        label="Выбрать все"
      />
      {selectedCount > 0 ? (
        <>
          <span className={`text-[14px] font-semibold text-[#5F5E5E] ${adminPanelMutedTextClass}`}>
            Выбрано: {String(selectedCount)}
          </span>
          <div className="flex flex-wrap gap-2">{children}</div>
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="text-[13px] font-semibold text-[#8C8C8C] underline-offset-2 hover:underline disabled:opacity-50"
          >
            Снять выделение
          </button>
        </>
      ) : null}
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
      ? "rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
      : undefined;

  return (
    <Button
      type="button"
      variant={variant === "primary" ? "primary" : "secondary"}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {label}
    </Button>
  );
}
