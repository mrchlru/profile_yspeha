"use client";

import React, { useEffect, useRef, useState } from "react";

export type AdminRowMoreMenuProps = {
  ariaLabel: string;
  children: React.ReactNode;
};

/**
 * Меню «⋯» для строк списков админки.
 */
export function AdminRowMoreMenu({ ariaLabel, children }: AdminRowMoreMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex size-8 items-center justify-center rounded-full text-[20px] leading-none text-[var(--admin-text-3)] hover:bg-[var(--admin-surface-muted)]"
      >
        ⋯
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-[12px] border border-[var(--admin-hairline)] bg-[var(--admin-surface)] py-1 shadow-[var(--admin-shadow-elevated)]"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export type AdminRowMenuItemProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

export function AdminRowMenuItem({
  label,
  onClick,
  disabled = false,
  tone = "default",
}: AdminRowMenuItemProps): React.ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`block w-full px-4 py-2.5 text-left text-[14px] font-medium disabled:opacity-50 ${
        tone === "danger" ? "text-[var(--admin-danger)]" : "text-[var(--admin-text)]"
      } hover:bg-[var(--admin-surface-muted)]`}
    >
      {label}
    </button>
  );
}
