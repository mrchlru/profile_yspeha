"use client";

import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";
import { useAuditFormStore } from "@/store/useAuditFormStore";

/**
 * Активно ли прохождение теста скрининга кандидата.
 * Используется для запрета выделения текста на инструкциях и вопросах.
 */
export function useScreeningNoSelect(): boolean {
  const hydrated = useFormStoreHydrated();
  const testKind = useFormStore((s) => s.activeTestKind);
  const accessCode = useFormStore((s) => s.validatedAccessCode);
  const batteryId = useAuditFormStore((s) => s.batteryId);
  const accessCodeSnapshot = useAuditFormStore((s) => s.accessCodeSnapshot);

  if (!hydrated) {
    return false;
  }
  if (testKind !== TEST_KIND_SCREENING) {
    return false;
  }
  return (
    accessCode !== null ||
    batteryId === "candidate_screening" ||
    (accessCodeSnapshot !== null && accessCodeSnapshot.trim().length >= 8)
  );
}
