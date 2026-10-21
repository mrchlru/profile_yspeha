"use client";

import React from "react";

export type AdminFolderSectionId =
  | "docs"
  | "sessions"
  | "files"
  | "dash"
  | "risks";

const SECTIONS: ReadonlyArray<{ id: AdminFolderSectionId; label: string }> = [
  { id: "docs", label: "Документы" },
  { id: "sessions", label: "Прохождения" },
  { id: "files", label: "Файлы" },
  { id: "dash", label: "Дашборд" },
  { id: "risks", label: "Риски" },
];

type AdminFolderSectionNavProps = {
  /** Скрыть пункты без контента на странице. */
  visible?: Partial<Record<AdminFolderSectionId, boolean>>;
};

/**
 * Якорная навигация по секциям папки сотрудника (макет 4.7).
 */
export function AdminFolderSectionNav({
  visible = {},
}: AdminFolderSectionNavProps): React.ReactElement {
  const items = SECTIONS.filter((section) => visible[section.id] !== false);

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-[11px] bg-[var(--admin-segment-track)] p-[3px]"
      aria-label="Разделы папки"
    >
      {items.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="inline-flex h-[34px] items-center rounded-[9px] px-4 text-[14px] font-medium text-[var(--admin-text-2)] transition hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)] hover:shadow-[var(--admin-shadow-segment)]"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
