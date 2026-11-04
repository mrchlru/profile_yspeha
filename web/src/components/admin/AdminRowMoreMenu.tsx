"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AdminRowMoreMenuProps = {
  ariaLabel: string;
  children: React.ReactNode;
};

type MenuCoords = {
  top: number;
  left: number;
  minWidth: number;
};

const MENU_MIN_WIDTH_PX = 180;
const MENU_VIEWPORT_PADDING_PX = 8;
const MENU_GAP_PX = 4;

function _coordsFromButton(button: HTMLButtonElement): MenuCoords {
  const buttonRect = button.getBoundingClientRect();
  return {
    top: buttonRect.bottom + MENU_GAP_PX,
    left: Math.max(MENU_VIEWPORT_PADDING_PX, buttonRect.right - MENU_MIN_WIDTH_PX),
    minWidth: MENU_MIN_WIDTH_PX,
  };
}

/**
 * Меню «⋯» для строк списков админки (dropdown в portal, не обрезается overflow).
 */
export function AdminRowMoreMenu({ ariaLabel, children }: AdminRowMoreMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function placeMenu(): void {
      const button = buttonRef.current;
      const menu = menuRef.current;
      if (button === null) {
        return;
      }
      const buttonRect = button.getBoundingClientRect();
      if (menu === null) {
        setCoords(_coordsFromButton(button));
        return;
      }

      const menuHeight = menu.offsetHeight;
      const menuWidth = Math.max(MENU_MIN_WIDTH_PX, menu.offsetWidth);

      let top = buttonRect.bottom + MENU_GAP_PX;
      if (top + menuHeight > window.innerHeight - MENU_VIEWPORT_PADDING_PX) {
        top = buttonRect.top - menuHeight - MENU_GAP_PX;
      }
      top = Math.max(
        MENU_VIEWPORT_PADDING_PX,
        Math.min(top, window.innerHeight - MENU_VIEWPORT_PADDING_PX - menuHeight)
      );

      let left = buttonRect.right - menuWidth;
      left = Math.max(
        MENU_VIEWPORT_PADDING_PX,
        Math.min(left, window.innerWidth - menuWidth - MENU_VIEWPORT_PADDING_PX)
      );

      setCoords({ top, left, minWidth: MENU_MIN_WIDTH_PX });
    }

    placeMenu();
    window.addEventListener("scroll", placeMenu, true);
    window.addEventListener("resize", placeMenu);
    return () => {
      window.removeEventListener("scroll", placeMenu, true);
      window.removeEventListener("resize", placeMenu);
    };
  }, [open, children]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menuPanel =
    open ? (
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          top: coords?.top ?? 0,
          left: coords?.left ?? 0,
          minWidth: coords?.minWidth ?? MENU_MIN_WIDTH_PX,
          zIndex: 10000,
          visibility: coords === null ? "hidden" : "visible",
        }}
        className="rounded-[12px] border border-[var(--admin-hairline)] bg-[var(--admin-surface)] py-1 shadow-[var(--admin-shadow-elevated)]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    ) : null;

  return (
    <>
      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => {
              const next = !value;
              if (next && buttonRef.current !== null) {
                setCoords(_coordsFromButton(buttonRef.current));
              }
              if (!next) {
                setCoords(null);
              }
              return next;
            });
          }}
          className="inline-flex size-8 items-center justify-center rounded-full text-[20px] leading-none text-[var(--admin-text-3)] hover:bg-[var(--admin-surface-muted)]"
        >
          ⋯
        </button>
      </div>
      {typeof document !== "undefined" && menuPanel !== null
        ? createPortal(menuPanel, document.body)
        : null}
    </>
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
      role="menuitem"
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
