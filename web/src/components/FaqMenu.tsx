"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { buildFaqMenuItems, type FaqMenuItem } from "@/lib/support/faqSupportConfig";

type MenuPosition = {
  top: number;
  right: number;
};

/**
 * Кнопка FAQ в шапке: выпадающий список действий (письма в support и политика).
 */
export function FaqMenu(): React.ReactElement {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const items = buildFaqMenuItems();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function updateMenuPosition(): void {
      const button = buttonRef.current;
      if (button === null) {
        return;
      }
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }

    function onPointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) === true) {
        return;
      }
      if (menuRef.current?.contains(target) === true) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menuPanel =
    open && menuPosition !== null ? (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="FAQ и поддержка"
        style={{ top: menuPosition.top, right: menuPosition.right }}
        className="fixed z-[9999] min-w-[320px] max-w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[20px] border border-black/10 bg-[#E8E8E8] py-2 shadow-[0px_8px_32px_rgba(0,0,0,0.18)]"
      >
        {items.map((item, index) => (
          <FaqMenuRow
            key={`${item.kind}-${item.label}`}
            item={item}
            showDivider={index === items.length - 2}
            onSelect={() => {
              setOpen(false);
            }}
          />
        ))}
      </div>
    ) : null;

  return (
    <div className="relative z-[60] h-[72px] w-[72px] shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="FAQ и поддержка"
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="relative h-full w-full rounded-full outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#00B596]/45"
      >
        <Image
          src="/branding/faq-icon.svg"
          alt=""
          fill
          sizes="72px"
          className="object-contain"
          aria-hidden
        />
      </button>

      {mounted && menuPanel !== null ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}

type FaqMenuRowProps = {
  item: FaqMenuItem;
  showDivider: boolean;
  onSelect: () => void;
};

function FaqMenuRow({ item, showDivider, onSelect }: FaqMenuRowProps): React.ReactElement {
  const rowClass =
    "block w-full px-4 py-3 text-left text-[15px] font-normal leading-snug text-[#4F4F4F] transition hover:bg-white/70 focus-visible:bg-white/70 focus-visible:outline-none";

  const content =
    item.kind === "link" ? (
      <Link href={item.href} role="menuitem" className={rowClass} onClick={onSelect}>
        {item.label}
      </Link>
    ) : (
      <a href={item.href} role="menuitem" className={rowClass} onClick={onSelect}>
        {item.label}
      </a>
    );

  return (
    <>
      {content}
      {showDivider ? <div className="my-1 border-t border-black/10" aria-hidden /> : null}
    </>
  );
}
