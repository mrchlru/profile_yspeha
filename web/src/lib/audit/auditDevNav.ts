/**
 * Режим технического тестирования аудита: панель перехода между шагами без
 * последовательного прохождения. Включается из админ-панели, флаг хранится в
 * `localStorage` в этом браузере (не для продакшн-респондентов).
 */

/** Совпадает с префиксом persist-стора аудита для единообразия. */
export const AUDIT_DEV_NAV_STORAGE_KEY = "screen_reserch:audit:dev_step_nav";

const _ENABLED_VALUE = "1";

/** Событие в окне после смены флага (вкладка или код). */
export const AUDIT_DEV_NAV_CHANGED_EVENT = "audit-dev-nav-changed";

/** Возвращает, включена ли панель навигации по шагам аудита. */
export function readAuditDevNavEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(AUDIT_DEV_NAV_STORAGE_KEY) === _ENABLED_VALUE;
  } catch {
    return false;
  }
}

/** Сохраняет флаг и уведомляет подписчиков в этом окне. */
export function writeAuditDevNavEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (enabled) {
      window.localStorage.setItem(AUDIT_DEV_NAV_STORAGE_KEY, _ENABLED_VALUE);
    } else {
      window.localStorage.removeItem(AUDIT_DEV_NAV_STORAGE_KEY);
    }
    window.dispatchEvent(new Event(AUDIT_DEV_NAV_CHANGED_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}
