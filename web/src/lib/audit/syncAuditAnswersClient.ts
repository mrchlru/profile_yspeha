import { screeningClientLog } from "@/lib/logging/screeningClientLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { postJsonWithSyncOutbox } from "@/lib/sync/syncOutbox";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";

const stepDraftTimers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Отправляет ответы завершённого шага аудита на сервер в фоне.
 */
export function queueAuditStepSync(stepIndex: number): void {
  void _syncAuditStepAnswers(stepIndex);
}

/**
 * Черновик шага: sync через короткую задержку после изменения ответа.
 */
export function queueAuditStepSyncDebounced(stepIndex: number, delayMs: number = 600): void {
  const existing = stepDraftTimers.get(stepIndex);
  if (existing !== undefined) {
    clearTimeout(existing);
  }
  stepDraftTimers.set(
    stepIndex,
    setTimeout(() => {
      stepDraftTimers.delete(stepIndex);
      void _syncAuditStepAnswers(stepIndex);
    }, delayMs)
  );
}

async function _syncAuditStepAnswers(stepIndex: number): Promise<void> {
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
  const outboxId = `audit:${accessCode}:${audit.sessionId}:step${String(stepIndex)}`;

  const ok = await postJsonWithSyncOutbox("/api/audit/sync-answers", body, outboxId);
  if (ok) {
    screeningClientLog("audit_step_sync_ok", { sessionRef, step: String(stepIndex) });
  } else {
    screeningClientLog("audit_step_sync_queued", { sessionRef, step: String(stepIndex) });
  }
}