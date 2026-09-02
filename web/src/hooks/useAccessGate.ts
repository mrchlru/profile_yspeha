"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAuditAccessTestKind, TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { usePersistStoreHydrated } from "@/hooks/usePersistStoreHydrated";
import { useFormStore } from "@/store/useFormStore";

export function useFormStoreHydrated(): boolean {
  return usePersistStoreHydrated(
    "profile-uspese-form-v13-anketa-expanded",
    useFormStore.persist
  );
}

/** Доступ к шагам скрининга: действующий код с видом «скрининг». */
export function useScreeningAccessReady(): boolean {
  const hydrated = useFormStoreHydrated();
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!accessCode || testKind !== TEST_KIND_SCREENING) {
      router.replace("/");
    }
  }, [accessCode, hydrated, router, testKind]);

  return hydrated && !!accessCode && testKind === TEST_KIND_SCREENING;
}

/** Страница «аудит» до запуска полного теста. */
export function useStateAuditAccessReady(): boolean {
  const hydrated = useFormStoreHydrated();
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!accessCode || !isAuditAccessTestKind(testKind)) {
      router.replace("/");
    }
  }, [accessCode, hydrated, router, testKind]);

  return hydrated && !!accessCode && isAuditAccessTestKind(testKind);
}
