"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isProfSbEducationTestKind } from "@/lib/access/testKinds";
import { usePersistStoreHydrated } from "@/hooks/usePersistStoreHydrated";
import { useTuBatteryProfSbMode } from "@/hooks/useTuBatteryProfSbMode";
import { BATTERY_PROF_SB_STEP_MARKER } from "@/lib/audit/batteryStepMarkers";
import { getAuditBatteryById } from "@/lib/audit/auditBatteries";
import { isBatteryWithProfSbId } from "@/lib/audit/isBatteryWithProfSb";
import { useStep4PageAccessReady } from "@/hooks/useStep4PageAccess";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useProfSbEducationFormStore } from "@/store/useProfSbEducationFormStore";

/**
 * Гидратирует persist-стор анкеты ПРОФ СБ + ПРОФ образование.
 */
export function useProfSbEducationFormStoreHydrated(): boolean {
  return usePersistStoreHydrated(
    "prof-sb-education-form-store-v1",
    useProfSbEducationFormStore.persist
  );
}

/**
 * Гейт для маршрутов `/prof-sb-education/*`: отдельная анкета или блок батареи ТУ.
 */
export function useProfSbEducationAccessReady(): boolean {
  const profHydrated = useProfSbEducationFormStoreHydrated();
  const formHydrated = useFormStoreHydrated();
  const storesHydrated = profHydrated && formHydrated;
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);
  const accessCodeSnapshot = useProfSbEducationFormStore((s) => s.accessCodeSnapshot);
  const hasStandaloneAccess = !!accessCode && isProfSbEducationTestKind(testKind);
  const hasSnapshotAccess =
    accessCodeSnapshot !== null && accessCodeSnapshot.trim().length >= 8;
  const hasAccess = hasStandaloneAccess || hasSnapshotAccess;

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

/**
 * Гейт шага ПРОФ СБ внутри батареи ТУ: нельзя перескочить по URL.
 * В режиме скрининга всегда возвращает `true`.
 */
export function useTuBatteryProfSbStepReady(): boolean {
  const tuMode = useTuBatteryProfSbMode();
  const accessReady = useStep4PageAccessReady();
  const router = useRouter();
  const batteryId = useAuditFormStore((s) => s.batteryId);
  const batteryStepSequence = useAuditFormStore((s) => s.batteryStepSequence);
  const batterySequenceUnlockedThrough = useAuditFormStore(
    (s) => s.batterySequenceUnlockedThrough
  );

  const stepReady =
    tuMode &&
    batteryId !== null &&
    isBatteryWithProfSbId(batteryId) &&
    batteryStepSequence !== null &&
    (() => {
      const battery = getAuditBatteryById(batteryId);
      if (battery === null) {
        return false;
      }
      const position = batteryStepSequence.indexOf(BATTERY_PROF_SB_STEP_MARKER);
      if (position < 0) {
        return false;
      }
      return position < batterySequenceUnlockedThrough;
    })();

  useEffect(() => {
    if (!accessReady || !tuMode) {
      return;
    }
    if (!stepReady) {
      router.replace("/audit/intro");
    }
  }, [accessReady, router, stepReady, tuMode]);

  if (!tuMode) {
    return true;
  }
  return accessReady && stepReady;
}

