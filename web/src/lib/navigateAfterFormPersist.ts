import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { ensureBatteryProfSbRouteCookie } from "@/lib/ensureBatteryProfSbRouteCookie";
import { flushFormPersistStateStorage } from "@/store/formPersistStorage";

/**
 * Сохраняет отложенный persist и переходит на следующий маршрут.
 * Microtask даёт zustand persist записать pending до flush.
 */
export function navigateAfterFormPersist(router: AppRouterInstance, route: string): void {
  queueMicrotask(() => {
    flushFormPersistStateStorage();
    ensureBatteryProfSbRouteCookie(route);
    router.push(route);
  });
}
