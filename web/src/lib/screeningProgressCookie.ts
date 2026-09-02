/**
 * Cookie прогресса скрининга для middleware: запрет прямого доступа к шагам 2–4 без прохождения предыдущих.
 * Значение — максимальный «открытый» шаг (1…4).
 */

export const SCREENING_MAX_STEP_COOKIE = "sr_max_step";

export type ScreeningMaxStep = 1 | 2 | 3 | 4;

/**
 * Устанавливает cookie на клиенте (вызывать из useEffect или перед router.push).
 */
export function setScreeningMaxStepCookie(step: ScreeningMaxStep): void {
  if (typeof document === "undefined") {
    return;
  }
  const maxAgeSec = 60 * 60 * 24 * 7;
  document.cookie = `${SCREENING_MAX_STEP_COOKIE}=${String(step)}; path=/; max-age=${String(maxAgeSec)}; SameSite=Lax`;
}
