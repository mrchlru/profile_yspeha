import type { TestKind } from "@/lib/access/testKinds";
import { isProctorTestKind } from "@/lib/access/testKinds";

export type ProctorMonitorStateInput = {
  testKind: TestKind | null;
  proctorMediaGranted: boolean;
  avProctorDisabled: boolean;
  sessionId: string | null;
  accessCode: string | null;
  started: boolean;
};

/** Базовые условия прокторинга (тип теста, сессия, код). */
export function isProctorSessionBound(input: ProctorMonitorStateInput): boolean {
  return (
    isProctorTestKind(input.testKind) &&
    input.started &&
    input.sessionId !== null &&
    input.accessCode !== null &&
    input.accessCode.trim().length > 0
  );
}

/** Полноэкранный режим и события вкладки/фокуса. */
export function isProctorSecurityMonitorActive(input: ProctorMonitorStateInput): boolean {
  return isProctorSessionBound(input);
}

/** Камера, микрофон, YOLO и запись звука. */
export function isProctorAvMonitorActive(input: ProctorMonitorStateInput): boolean {
  return (
    isProctorSessionBound(input) && !input.avProctorDisabled && input.proctorMediaGranted
  );
}

/** @deprecated Используйте isProctorAvMonitorActive. */
export function isProctorMonitorActive(input: ProctorMonitorStateInput): boolean {
  return isProctorAvMonitorActive(input);
}
