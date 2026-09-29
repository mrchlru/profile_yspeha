import { debouncedBackgroundSync } from "@/lib/sync/debouncedBackgroundSync";
import { useFormStore } from "@/store/useFormStore";
import { useAttestationFormStore } from "@/store/useAttestationFormStore";

const SYNC_KEY = "attestation-answers";

/**
 * Планирует фоновую синхронизацию ответов аттестации (debounce 2 с).
 */
export function queueAttestationAnswersSync(): void {
  debouncedBackgroundSync(SYNC_KEY, () => {
    void _syncAttestationAnswers();
  });
}

async function _syncAttestationAnswers(): Promise<void> {
  const attestation = useAttestationFormStore.getState();
  const form = useFormStore.getState();
  const accessCode = (attestation.accessCodeSnapshot ?? form.validatedAccessCode ?? "").trim();

  if (!attestation.sessionId || accessCode.length < 8) {
    return;
  }
  if (attestation.firstName.trim().length === 0 || attestation.lastName.trim().length === 0) {
    return;
  }
  if (Object.keys(attestation.answers).length === 0) {
    return;
  }

  try {
    await fetch("/api/attestation/sync-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId: attestation.sessionId,
        accessCode,
        firstName: attestation.firstName.trim(),
        lastName: attestation.lastName.trim(),
        answers: attestation.answers,
        personalDataConsent: attestation.personalDataConsent,
        consentRecordedAt: attestation.consentRecordedAt ?? undefined,
      }),
    });
  } catch {
    /* localStorage остаётся резервной копией */
  }
}
