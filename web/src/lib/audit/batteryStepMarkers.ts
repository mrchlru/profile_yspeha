/** Маркер шага анкеты ПРОФ СБ в перемешанной последовательности батареи ТУ / упров / шефов. */
export const BATTERY_PROF_SB_STEP_MARKER = 0;

/** Маршрут прохождения блока ПРОФ СБ внутри батареи (анкета скрининга, step-4). */
export const BATTERY_PROF_SB_ROUTE = "/step-4" as const;

/**
 * Проверяет, что индекс шага — маркер анкеты ПРОФ СБ (не шаг аудита).
 */
export function isBatteryProfSbStepMarker(stepIndex: number): boolean {
  return stepIndex === BATTERY_PROF_SB_STEP_MARKER;
}
