import type { TestKind } from "@/lib/access/testKinds";
import { isProctorTestKind } from "@/lib/access/testKinds";

export type ProctorMonitorStateInput = {
  testKind: TestKind | null;
  proctorMediaGranted: boolean;
  sessionId: string | null;
  accessCode: string | null;
  started: boolean;
};

/** Включён ли UI и мониторинг прокторинга для текущей сессии. */
export function isProctorMonitorActive(input: ProctorMonitorStateInput): boolean {
  return (
    isProctorTestKind(input.testKind) &&
    input.proctorMediaGranted &&
    input.started &&
    input.sessionId !== null &&
    input.accessCode !== null &&
    input.accessCode.trim().length > 0
  );
}
