"use client";

import React, { useEffect, useMemo, useState } from "react";

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
 * Якорная навигация по секциям папки сотрудника с scrollspy.
 */
export function AdminFolderSectionNav({
  visible = {},
}: AdminFolderSectionNavProps): React.ReactElement {
  const items = useMemo(
    () => SECTIONS.filter((section) => visible[section.id] !== false),
    [visible]
  );
  const sectionIdsKey = items.map((section) => section.id).join(",");
  const [activeId, setActiveId] = useState<AdminFolderSectionId>("docs");

  useEffect(() => {
    const first = sectionIdsKey.split(",")[0] as AdminFolderSectionId | undefined;
    if (first) {
      setActiveId(first);
    }
  }, [sectionIdsKey]);

  useEffect(() => {
    const sectionElements = items
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);
    if (sectionElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visibleEntries[0]?.target.id as AdminFolderSectionId | undefined;
        if (top && items.some((item) => item.id === top)) {
          setActiveId(top);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    for (const element of sectionElements) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [items, sectionIdsKey]);

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-[11px] bg-[var(--admin-segment-track)] p-[3px]"
      aria-label="Разделы папки"
    >
      {items.map((section) => {
        const active = section.id === activeId;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => setActiveId(section.id)}
            className={`inline-flex h-[34px] items-center rounded-[9px] px-4 text-[14px] transition ${
              active
                ? "bg-[var(--admin-surface)] font-semibold text-[var(--admin-text)] shadow-[var(--admin-shadow-segment)]"
                : "font-medium text-[var(--admin-text-2)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)] hover:shadow-[var(--admin-shadow-segment)]"
            }`}
          >
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}
