"use client";

import { useProctorBinding } from "@/hooks/useProctorBinding";
import { isProctorTestKind } from "@/lib/access/testKinds";
import { isProctorMonitorActive } from "@/lib/proctor/proctorMonitorState";
import { useFormStore } from "@/store/useFormStore";

/** Нужен ли блок запроса камеры на intro для активной батареи. */
export function useProctorIntroRequired(): boolean {
  const testKind = useFormStore((s) => s.activeTestKind);
  return isProctorTestKind(testKind);
}

/** Разрешена ли камера (или прокторинг не требуется). */
export function useProctorIntroReady(): boolean {
  const required = useProctorIntroRequired();
  const proctorMediaGranted = useFormStore((s) => s.proctorMediaGranted);
  return !required || proctorMediaGranted;
}

/** Включён ли UI и мониторинг прокторинга на шагах теста. */
export function useProctorMonitorEnabled(): boolean {
  const testKind = useFormStore((s) => s.activeTestKind);
  const proctorMediaGranted = useFormStore((s) => s.proctorMediaGranted);
  const binding = useProctorBinding();

  return isProctorMonitorActive({
    testKind,
    proctorMediaGranted,
    ...binding,
  });
}
