"use client";

import { useProctorBinding } from "@/hooks/useProctorBinding";
import { isProctorTestKind } from "@/lib/access/testKinds";
import {
  isProctorAvMonitorActive,
  isProctorSecurityMonitorActive,
} from "@/lib/proctor/proctorMonitorState";
import { useFormStore } from "@/store/useFormStore";

/** Нужен ли блок запроса камеры на intro для активной батареи. */
export function useProctorIntroRequired(): boolean {
  const testKind = useFormStore((s) => s.activeTestKind);
  const avProctorDisabled = useFormStore((s) => s.activeInviteAvProctorDisabled);
  return isProctorTestKind(testKind) && !avProctorDisabled;
}

/** Разрешена ли камера (или прокторинг не требуется / AV отключён на приглашении). */
export function useProctorIntroReady(): boolean {
  const testKind = useFormStore((s) => s.activeTestKind);
  const avProctorDisabled = useFormStore((s) => s.activeInviteAvProctorDisabled);
  const required = useProctorIntroRequired();
  const proctorMediaGranted = useFormStore((s) => s.proctorMediaGranted);
  if (isProctorTestKind(testKind) && avProctorDisabled) {
    return true;
  }
  return !required || proctorMediaGranted;
}

/** Включён ли UI и мониторинг камеры/микрофона на шагах теста. */
export function useProctorMonitorEnabled(): boolean {
  const testKind = useFormStore((s) => s.activeTestKind);
  const proctorMediaGranted = useFormStore((s) => s.proctorMediaGranted);
  const avProctorDisabled = useFormStore((s) => s.activeInviteAvProctorDisabled);
  const binding = useProctorBinding();

  return isProctorAvMonitorActive({
    testKind,
    proctorMediaGranted,
    avProctorDisabled,
    ...binding,
  });
}

/** Включён ли контроль полноэкранного режима и вкладки. */
export function useProctorSecurityEnabled(): boolean {
  const testKind = useFormStore((s) => s.activeTestKind);
  const avProctorDisabled = useFormStore((s) => s.activeInviteAvProctorDisabled);
  const binding = useProctorBinding();

  return isProctorSecurityMonitorActive({
    testKind,
    proctorMediaGranted: false,
    avProctorDisabled,
    ...binding,
  });
}
