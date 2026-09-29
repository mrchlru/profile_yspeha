"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isAttestationTestKind } from "@/lib/access/testKinds";
import { usePersistStoreHydrated } from "@/hooks/usePersistStoreHydrated";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";
import { useAttestationFormStore } from "@/store/useAttestationFormStore";

/**
 * Гидратирует persist-стор аттестации.
 */
export function useAttestationFormStoreHydrated(): boolean {
  return usePersistStoreHydrated(
    "attestation-form-store-v1",
    useAttestationFormStore.persist
  );
}

/**
 * Гейт для маршрутов `/attestation/*`.
 */
export function useAttestationAccessReady(): boolean {
  const attestationHydrated = useAttestationFormStoreHydrated();
  const formHydrated = useFormStoreHydrated();
  const storesHydrated = attestationHydrated && formHydrated;
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);
  const accessCodeSnapshot = useAttestationFormStore((s) => s.accessCodeSnapshot);
  const hasFormAccess = !!accessCode && isAttestationTestKind(testKind);
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
