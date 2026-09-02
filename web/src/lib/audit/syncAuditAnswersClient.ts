import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";

/**
 * Отправляет ответы завершённого шага аудита на сервер в фоне.
 */
export function queueAuditStepSync(stepIndex: number): void {
  void _syncAuditStepAnswers(stepIndex);
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

  try {
    await fetch("/api/audit/sync-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId: audit.sessionId,
        accessCode,
        firstName: audit.firstName.trim(),
        lastName: audit.lastName.trim(),
        stepIndex,
        stepAnswers,
        personalDataConsent: audit.personalDataConsent,
        consentRecordedAt: audit.consentRecordedAt ?? undefined,
      }),
    });
  } catch {
    /* localStorage остаётся резервной копией */
  }
}
