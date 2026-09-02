"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isBurnoutTestKind } from "@/lib/access/testKinds";
import { usePersistStoreHydrated } from "@/hooks/usePersistStoreHydrated";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";
import { useBurnoutFormStore } from "@/store/useBurnoutFormStore";

/**
 * Гидратирует persist-стор теста на выгорание.
 */
export function useBurnoutFormStoreHydrated(): boolean {
  return usePersistStoreHydrated("burnout-form-store-v1", useBurnoutFormStore.persist);
}

/**
 * Гейт для маршрутов `/burnout/*`: код доступа с типом `burnout`.
 */
export function useBurnoutAccessReady(): boolean {
  const burnoutHydrated = useBurnoutFormStoreHydrated();
  const formHydrated = useFormStoreHydrated();
  const storesHydrated = burnoutHydrated && formHydrated;
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);
  const accessCodeSnapshot = useBurnoutFormStore((s) => s.accessCodeSnapshot);
  const hasFormAccess = !!accessCode && isBurnoutTestKind(testKind);
  const hasSnapshotAccess =
    accessCodeSnapshot !== null && accessCodeSnapshot.trim().length >= 8;
  const hasAccess = hasFormAccess || hasSnapshotAccess;

  useEffect(() => {
    if (!storesHydrated) {
      return;
    }
    if (!hasAccess) {
      router.replace("/");
    }
  }, [hasAccess, router, storesHydrated]);

  return storesHydrated && hasAccess;
}
