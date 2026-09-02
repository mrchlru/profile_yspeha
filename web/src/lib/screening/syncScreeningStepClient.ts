import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";

export type ScreeningSyncStep = 1 | 2 | 3 | 4;

/**
 * Отправляет ответы завершённого шага скрининга на сервер в фоне.
 */
export function queueScreeningStepSync(step: ScreeningSyncStep): void {
  void _syncScreeningStep(step);
}

async function _syncScreeningStep(step: ScreeningSyncStep): Promise<void> {
  const form = useFormStore.getState();
  const audit = useAuditFormStore.getState();
  const accessCode = (form.validatedAccessCode ?? audit.accessCodeSnapshot ?? "").trim();

  const inAuditBattery = audit.batteryId !== null && audit.sessionId !== null;
  const sessionId =
    inAuditBattery && step === 4
      ? audit.sessionId
      : form.sessionId;

  if (!sessionId || accessCode.length < 8) {
    return;
  }

  const profileName =
    form.profileName.trim() ||
    [audit.lastName, audit.firstName].filter((part) => part.trim().length > 0).join(" ").trim();
  if (profileName.length === 0) {
    return;
  }

  const stepData =
    step === 1
      ? form.step1Data
      : step === 2
        ? form.step2Data
        : step === 3
          ? form.step3Data
          : form.step4Data;

  try {
    await fetch("/api/submit/sync-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId,
        accessCode,
        profileName,
        step,
        stepData,
        personalDataConsent: form.personalDataConsent || audit.personalDataConsent,
        consentRecordedAt: form.consentRecordedAt ?? audit.consentRecordedAt ?? undefined,
      }),
    });
  } catch {
    /* localStorage остаётся резервной копией */
  }
}
