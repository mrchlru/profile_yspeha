import { screeningClientLog } from "@/lib/logging/screeningClientLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { postJsonRequireOnline } from "@/lib/sync/unstableConnection";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";

/**
 * Сохраняет ответы шага аудита на сервер; без сети переход блокируется.
 */
export async function syncAuditStepAnswersNow(stepIndex: number): Promise<void> {
  const audit = useAuditFormStore.getState();
  const form = useFormStore.getState();
  const accessCode = (audit.accessCodeSnapshot ?? form.validatedAccessCode ?? "").trim();
  if (!audit.sessionId || accessCode.length < 8) {
    return;
  }
  if (audit.firstName.trim().length === 0 || audit.lastName.trim().length === 0) {
    return;
  }

  const stepAnswers = audit.answers[stepIndex];
  if (!stepAnswers || Object.keys(stepAnswers).length === 0) {
    return;
  }

  const sessionRef = shortSessionRef(audit.sessionId);
  const body = {
    sessionId: audit.sessionId,
    accessCode,
    firstName: audit.firstName.trim(),
    lastName: audit.lastName.trim(),
    stepIndex,
    stepAnswers,
    personalDataConsent: audit.personalDataConsent,
    consentRecordedAt: audit.consentRecordedAt ?? undefined,
  };

  await postJsonRequireOnline("/api/audit/sync-answers", body);
  screeningClientLog("audit_step_sync_ok", { sessionRef, step: String(stepIndex) });
}

/** Не используется: сохранение только при переходе на следующий шаг. */
export function queueAuditStepSync(_stepIndex: number): void {}

/** Не используется: сохранение только при переходе на следующий шаг. */
export function queueAuditStepSyncDebounced(_stepIndex: number, _delayMs: number = 600): void {}

export async function flushAuditDebouncedStepSync(_stepIndex: number): Promise<void> {}