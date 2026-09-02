import type { StateStorage } from "zustand/middleware";

const DEBOUNCE_MS = 350;

const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Обёртка над localStorage с отложенной записью: снимает пики синхронной
 * сериализации при каждом ответе в длинной анкете. Перед чтением и при
 * уходе со страницы отложенное значение сбрасывается на диск.
 */
function createDebouncedLocalStorage(): { storage: StateStorage; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { name: string; value: string } | null = null;

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending !== null) {
      try {
        localStorage.setItem(pending.name, pending.value);
      } catch {
        /* квота / приватный режим */
      }
      pending = null;
    }
  };

  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  });

  const storage: StateStorage = {
    getItem: (name) => {
      flush();
      return localStorage.getItem(name);
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(flush, DEBOUNCE_MS);
    },
    removeItem: (name) => {
      pending = null;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      localStorage.removeItem(name);
    },
  };

  return { storage, flush };
}

let clientSingleton: StateStorage | null = null;
let clientFlush: (() => void) | null = null;

export function getFormPersistStateStorage(): StateStorage {
  if (typeof window === "undefined") {
    return serverStorage;
  }
  if (clientSingleton === null) {
    const debounced = createDebouncedLocalStorage();
    clientSingleton = debounced.storage;
    clientFlush = debounced.flush;
  }
  return clientSingleton;
}

/**
 * Сбрасывает отложенную запись persist-сторов в localStorage.
 * Вызывать перед клиентской навигацией между шагами батареи.
 */
export function flushFormPersistStateStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  getFormPersistStateStorage();
  clientFlush?.();
}
