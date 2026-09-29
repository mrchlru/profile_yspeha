import { debouncedBackgroundSync } from "@/lib/sync/debouncedBackgroundSync";
import { useFormStore } from "@/store/useFormStore";
import { useSpecialistScreeningFormStore } from "@/store/useSpecialistScreeningFormStore";

const SYNC_KEY = "specialist-screening-answers";

/**
 * Планирует фоновую синхронизацию ответов скрининга (debounce 2 с).
 */
export function queueSpecialistScreeningAnswersSync(): void {
  debouncedBackgroundSync(SYNC_KEY, () => {
    void _syncSpecialistScreeningAnswers();
  });
}

async function _syncSpecialistScreeningAnswers(): Promise<void> {
  const screening = useSpecialistScreeningFormStore.getState();
  const form = useFormStore.getState();
  const accessCode = (screening.accessCodeSnapshot ?? form.validatedAccessCode ?? "").trim();

  if (!screening.sessionId || accessCode.length < 8) {
    return;
  }
  if (screening.firstName.trim().length === 0 || screening.lastName.trim().length === 0) {
    return;
  }
  if (Object.keys(screening.answers).length === 0) {
    return;
  }

  try {
    await fetch("/api/specialist-screening/sync-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId: screening.sessionId,
        accessCode,
        firstName: screening.firstName.trim(),
        lastName: screening.lastName.trim(),
        answers: screening.answers,
        personalDataConsent: screening.personalDataConsent,
        consentRecordedAt: screening.consentRecordedAt ?? undefined,
      }),
    });
  } catch {
    /* localStorage остаётся резервной копией */
  }
}
