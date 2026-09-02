"use client";

import { useEffect, useState } from "react";

import { flushFormPersistStateStorage } from "@/store/formPersistStorage";

type PersistApi = {
  rehydrate?: () => Promise<void> | void;
};

const sessionHydratedPersistNames = new Set<string>();

/**
 * Однократная гидратация persist-стора за SPA-сессию.
 * Повторный rehydrate при client-side навигации затирал бы свежий прогресс
 * устаревшим снимком из localStorage (запись отложена на 350 ms).
 */
export function usePersistStoreHydrated(
  persistName: string,
  persistApi: PersistApi | undefined
): boolean {
  const [hydrated, setHydrated] = useState(() =>
    sessionHydratedPersistNames.has(persistName)
  );

  useEffect(() => {
    if (sessionHydratedPersistNames.has(persistName)) {
      setHydrated(true);
      return;
    }
    if (persistApi && typeof persistApi.rehydrate === "function") {
      flushFormPersistStateStorage();
      void Promise.resolve(persistApi.rehydrate()).finally(() => {
        sessionHydratedPersistNames.add(persistName);
        setHydrated(true);
      });
      return;
    }
    sessionHydratedPersistNames.add(persistName);
    setHydrated(true);
  }, [persistApi, persistName]);

  return hydrated;
}
