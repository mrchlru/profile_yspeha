import { debouncedBackgroundSync } from "@/lib/sync/debouncedBackgroundSync";
import { useBurnoutFormStore } from "@/store/useBurnoutFormStore";
import { useFormStore } from "@/store/useFormStore";

const SYNC_KEY = "burnout-answers";

/**
 * Планирует фоновую синхронизацию ответов выгорания (debounce 2 с).
 */
export function queueBurnoutAnswersSync(): void {
  debouncedBackgroundSync(SYNC_KEY, () => {
    void _syncBurnoutAnswers();
  });
}

async function _syncBurnoutAnswers(): Promise<void> {
  const burnout = useBurnoutFormStore.getState();
  const form = useFormStore.getState();
  const accessCode = (burnout.accessCodeSnapshot ?? form.validatedAccessCode ?? "").trim();

  if (!burnout.sessionId || accessCode.length < 8) {
    return;
  }
  if (burnout.firstName.trim().length === 0 || burnout.lastName.trim().length === 0) {
    return;
  }
  if (Object.keys(burnout.answers).length === 0) {
    return;
  }

  try {
    await fetch("/api/burnout/sync-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId: burnout.sessionId,
        accessCode,
        firstName: burnout.firstName.trim(),
        lastName: burnout.lastName.trim(),
        answers: burnout.answers,
        personalDataConsent: burnout.personalDataConsent,
        consentRecordedAt: burnout.consentRecordedAt ?? undefined,
      }),
    });
  } catch {
    /* localStorage остаётся резервной копией */
  }
}
