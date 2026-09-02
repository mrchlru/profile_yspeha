"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAuditAccessTestKind } from "@/lib/access/testKinds";
import { useAuditDevNavEnabled } from "@/hooks/useAuditDevNavEnabled";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { usePersistStoreHydrated } from "@/hooks/usePersistStoreHydrated";
import { useFormStore } from "@/store/useFormStore";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import {
  getAuditBatteryById,
  getBatteryStepSequencePositionFromSequence,
} from "@/lib/audit/auditBatteries";

/**
 * Гидратирует persist-стор аудита и сообщает, готов ли он к чтению.
 * Аналог `useFormStoreHydrated` из скрининга, но для отдельного стора аудита.
 */
export function useAuditFormStoreHydrated(): boolean {
  return usePersistStoreHydrated("audit-form-v5-od-identity", useAuditFormStore.persist);
}

/**
 * Гейт для маршрутов `/audit/*`: проверяет, что пользователь зашёл по коду «state_audit» или «state_audit_dev».
 * Если нет — редиректит на `/` (экран ввода кода).
 *
 * Возвращает `true`, когда сторы загружены и доступ подтверждён.
 */
export function useAuditAccessReady(): boolean {
  const auditHydrated = useAuditFormStoreHydrated();
  const formHydrated = useFormStoreHydrated();
  const storesHydrated = auditHydrated && formHydrated;
  const router = useRouter();
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const testKind = useFormStore((s) => s.activeTestKind);
  const accessCodeSnapshot = useAuditFormStore((s) => s.accessCodeSnapshot);
  const hasFormAccess = !!accessCode && isAuditAccessTestKind(testKind);
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

/**
 * Гейт для отдельного шага аудита. Кроме общего гейта (`useAuditAccessReady`)
 * проверяет, что пользователь достиг этого шага (нельзя перескочить по URL).
 * Если нет — редиректит на `/audit/intro`.
 */
export function useAuditStepReady(stepIndex: number): boolean {
  const accessReady = useAuditAccessReady();
  const router = useRouter();
  const maxUnlockedStep = useAuditFormStore((s) => s.maxUnlockedStep);
  const batteryId = useAuditFormStore((s) => s.batteryId);
  const batteryStepSequence = useAuditFormStore((s) => s.batteryStepSequence);
  const batterySequenceUnlockedThrough = useAuditFormStore(
    (s) => s.batterySequenceUnlockedThrough
  );
  const devNav = useAuditDevNavEnabled();

  const batteryReady =
    batteryId !== null &&
    batteryStepSequence !== null &&
    (() => {
      const battery = getAuditBatteryById(batteryId);
      if (battery === null) {
        return false;
      }
      const position = getBatteryStepSequencePositionFromSequence(
        batteryStepSequence,
        stepIndex
      );
      if (position < 0) {
        return false;
      }
      return position < batterySequenceUnlockedThrough;
    })();

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (devNav) {
      return;
    }
    if (batteryId !== null && batteryStepSequence !== null) {
      if (!batteryReady) {
        router.replace("/audit/intro");
      }
      return;
    }
    if (maxUnlockedStep < stepIndex) {
      router.replace("/audit/intro");
    }
  }, [
    accessReady,
    batteryId,
    batteryReady,
    batteryStepSequence,
    devNav,
    maxUnlockedStep,
    router,
    stepIndex,
  ]);

  if (batteryId !== null && batteryStepSequence !== null) {
    return accessReady && (devNav || batteryReady);
  }
  return accessReady && (devNav || maxUnlockedStep >= stepIndex);
}
