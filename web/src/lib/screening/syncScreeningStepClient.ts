import { screeningClientLog } from "@/lib/logging/screeningClientLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { postJsonWithSyncOutbox } from "@/lib/sync/syncOutbox";
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
    inAuditBattery && step === 4 ? audit.sessionId : form.sessionId;

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

  const sessionRef = shortSessionRef(sessionId);
  const body = {
    sessionId,
    accessCode,
    profileName,
    step,
    stepData,
    personalDataConsent: form.personalDataConsent || audit.personalDataConsent,
    consentRecordedAt: form.consentRecordedAt ?? audit.consentRecordedAt ?? undefined,
  };
  const outboxId = `screening:${accessCode}:${sessionId}:step${String(step)}`;

  const ok = await postJsonWithSyncOutbox("/api/submit/sync-answers", body, outboxId);
  if (ok) {
    screeningClientLog("screening_step_sync_ok", { sessionRef, step: String(step) });
  } else {
    screeningClientLog("screening_step_sync_queued", { sessionRef, step: String(step) });
  }
}