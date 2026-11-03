"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "adminSidebarCollapsed";

/**
 * Сохраняет и восстанавливает состояние свёрнутого бокового меню админки.
 */
export function useAdminSidebarCollapsed(): {
  collapsed: boolean;
  hydrated: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
} {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "1") {
        setCollapsedState(true);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setCollapsed = useCallback((value: boolean): void => {
    setCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((): void => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return { collapsed, hydrated, toggle, setCollapsed };
}
