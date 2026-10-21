"use client";

import React, { useEffect } from "react";

export type AdminSettingsSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Боковая панель настроек (480px).
 */
export function AdminSettingsSheet({
  open,
  title,
  onClose,
  children,
}: AdminSettingsSheetProps): React.ReactElement | null {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-settings-sheet-title"
        className="relative flex h-full w-full max-w-[480px] flex-col bg-[var(--admin-surface)] shadow-[var(--admin-shadow-elevated)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--admin-hairline)] px-5 py-4">
          <h2 id="admin-settings-sheet-title" className="text-[20px] font-semibold text-[var(--admin-text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-full text-[24px] text-[var(--admin-text-3)] hover:bg-[var(--admin-surface-muted)]"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}
