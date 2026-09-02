import { getAuditStepByIndex } from "@/lib/audit/auditSteps";
import {
  BATTERY_PROF_SB_ROUTE,
  BATTERY_PROF_SB_STEP_MARKER,
  isBatteryProfSbStepMarker,
} from "@/lib/audit/batteryStepMarkers";
import { getNextBatteryStepIndexFromSequence } from "@/lib/audit/auditBatteries";

/**
 * Возвращает маршрут для шага батареи (аудит или анкета ПРОФ СБ).
 */
export function getBatteryRouteForStepIndex(stepIndex: number): string {
  if (isBatteryProfSbStepMarker(stepIndex)) {
    return BATTERY_PROF_SB_ROUTE;
  }
  const slug = getAuditStepByIndex(stepIndex)?.slug;
  return slug ? `/audit/${slug}` : "/audit/intro";
}

/**
 * Первый маршрут прохождения по сохранённой последовательности.
 */
export function getBatteryEntryRouteFromSequence(
  stepSequence: ReadonlyArray<number>
): string {
  const firstIndex = stepSequence[0];
  if (firstIndex === undefined) {
    return "/audit/intro";
  }
  return getBatteryRouteForStepIndex(firstIndex);
}

/**
 * Маршрут «продолжить» с учётом разблокированных позиций в батарее.
 */
export function getBatteryResumeRouteFromSequence(
  stepSequence: ReadonlyArray<number>,
  unlockedThrough: number,
  currentStep: number
): string {
  if (isBatteryProfSbStepMarker(currentStep)) {
    return BATTERY_PROF_SB_ROUTE;
  }
  const position = Math.max(0, unlockedThrough - 1);
  const stepIndex = stepSequence[position];
  if (stepIndex === undefined) {
    return getBatteryEntryRouteFromSequence(stepSequence);
  }
  return getBatteryRouteForStepIndex(stepIndex);
}

/**
 * Следующий маршрут после завершения шага или `null`, если батарея пройдена.
 */
export function getBatteryNextRouteAfterStep(
  stepSequence: ReadonlyArray<number>,
  completedStepIndex: number
): string | null {
  const nextIndex = getNextBatteryStepIndexFromSequence(stepSequence, completedStepIndex);
  if (nextIndex === null) {
    return null;
  }
  return getBatteryRouteForStepIndex(nextIndex);
}

/**
 * Slug первого шага аудита в последовательности (без маркера ПРОФ СБ).
 */
export function getBatteryFirstAuditStepSlugFromSequence(
  stepSequence: ReadonlyArray<number>
): string | null {
  for (const stepIndex of stepSequence) {
    if (stepIndex === BATTERY_PROF_SB_STEP_MARKER) {
      continue;
    }
    return getAuditStepByIndex(stepIndex)?.slug ?? null;
  }
  return null;
}
