import { debouncedBackgroundSync } from "@/lib/sync/debouncedBackgroundSync";
import { useFormStore } from "@/store/useFormStore";
import { useProfSbEducationFormStore } from "@/store/useProfSbEducationFormStore";

const SYNC_KEY = "prof-sb-education-answers";

/**
 * Планирует фоновую синхронизацию анкеты ПРОФ СБ (debounce 2 с).
 */
export function queueProfSbEducationAnswersSync(): void {
  debouncedBackgroundSync(SYNC_KEY, () => {
    void _syncProfSbEducationAnswers();
  });
}

async function _syncProfSbEducationAnswers(): Promise<void> {
  const prof = useProfSbEducationFormStore.getState();
  const form = useFormStore.getState();
  const accessCode = (prof.accessCodeSnapshot ?? form.validatedAccessCode ?? "").trim();

  if (!prof.sessionId || accessCode.length < 8) {
    return;
  }
  if (prof.firstName.trim().length === 0 || prof.lastName.trim().length === 0) {
    return;
  }

  try {
    await fetch("/api/prof-sb-education/sync-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId: prof.sessionId,
        accessCode,
        firstName: prof.firstName.trim(),
        lastName: prof.lastName.trim(),
        answers: prof.answers,
        personalDataConsent: prof.personalDataConsent,
        consentRecordedAt: prof.consentRecordedAt ?? undefined,
      }),
    });
  } catch {
    /* localStorage остаётся резервной копией */
  }
}
