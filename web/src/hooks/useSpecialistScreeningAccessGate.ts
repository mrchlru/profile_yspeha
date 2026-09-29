"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isSpecialistScreeningTestKind } from "@/lib/access/testKinds";
import { usePersistStoreHydrated } from "@/hooks/usePersistStoreHydrated";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";
import { useSpecialistScreeningFormStore } from "@/store/useSpecialistScreeningFormStore";

/**
 * Гидратирует persist-стор скрининга направления к специалисту.
 */
export function useSpecialistScreeningFormStoreHydrated(): boolean {
  return usePersistStoreHydrated(
    "specialist-screening-form-store-v1",
    useSpecialistScreeningFormStore.persist
  );
}

/**
 * Гейт для маршрутов `/specialist-screening/*`.
 */
export function useSpecialistScreeningAccessReady(): boolean {
  const screeningHydrated = useSpecialistScreeningFormStoreHydrated();
  const formHydrated = useFormStoreHydrated();
  const storesHydrated = screeningHydrated && formHydrated;
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);
  const accessCodeSnapshot = useSpecialistScreeningFormStore((s) => s.accessCodeSnapshot);
  const hasFormAccess = !!accessCode && isSpecialistScreeningTestKind(testKind);
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
