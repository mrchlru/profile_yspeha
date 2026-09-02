import { BATTERY_PROF_SB_ROUTE } from "@/lib/audit/batteryStepMarkers";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";

/**
 * Middleware разрешает `/step-4` только при cookie `sr_max_step >= 4`.
 * В батарее скрининга анкета ПРОФ СБ открывается без legacy-маршрута step-1…3,
 * поэтому cookie нужно выставить до client-side перехода на `/step-4`.
 */
export function ensureBatteryProfSbRouteCookie(route: string): void {
  if (route === BATTERY_PROF_SB_ROUTE || route.startsWith(`${BATTERY_PROF_SB_ROUTE}/`)) {
    setScreeningMaxStepCookie(4);
  }
}
