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

/**
 * Сохраняет persist, дожидается sync и только затем переходит по маршруту.
 */
export async function navigateAfterFormPersistWhenSynced(
  router: AppRouterInstance,
  route: string,
  awaitSync: () => Promise<void>
): Promise<void> {
  flushFormPersistStateStorage();
  await awaitSync();
  ensureBatteryProfSbRouteCookie(route);
  router.push(route);
}
