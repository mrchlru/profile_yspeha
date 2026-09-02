import {
  PROCTOR_EVENT_IDENTITY_CHECK_FAILED,
  PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT,
  type ProctorEventKind,
} from "@/lib/proctor/proctorEventKinds";
import type { OdIdentityCheckOutcome } from "@/lib/identity/odIdentityTypes";

type PostIdentityCheckEventInput = {
  sessionId: string;
  accessCode: string;
  fieldLabel: string;
  fieldId: string;
  outcome: Exclude<OdIdentityCheckOutcome, "passed">;
  stepLabel: string | null;
};

/**
 * Отправляет событие неуспешной проверки личности в отчёт по нарушениям.
 */
export function postIdentityCheckEvent(input: PostIdentityCheckEventInput): void {
  const kind: ProctorEventKind =
    input.outcome === "timeout" || input.outcome === "empty"
      ? PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT
      : PROCTOR_EVENT_IDENTITY_CHECK_FAILED;

  const clientEventId = `identity-${input.sessionId}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;

  void fetch("/api/proctor/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: input.sessionId,
      accessCode: input.accessCode,
      events: [
        {
          clientEventId,
          kind,
          occurredAt: new Date().toISOString(),
          metadata: {
            identityFieldId: input.fieldId,
            identityFieldLabel: input.fieldLabel,
            identityOutcome: input.outcome,
            stepLabel: input.stepLabel,
          },
        },
      ],
    }),
  }).catch(() => {
    /* не блокируем прохождение теста */
  });
}
