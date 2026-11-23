import { postJsonRequireOnline } from "@/lib/sync/unstableConnection";
import { useBurnoutFormStore } from "@/store/useBurnoutFormStore";
import { useFormStore } from "@/store/useFormStore";

/** Не используется: сохранение при завершении теста. */
export function queueBurnoutAnswersSync(): void {}

/**
 * Сохраняет ответы теста выгорания на сервер перед финишем.
 */
export async function syncBurnoutAnswersNow(): Promise<void> {
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

  await postJsonRequireOnline("/api/burnout/sync-answers", {
    sessionId: burnout.sessionId,
    accessCode,
    firstName: burnout.firstName.trim(),
    lastName: burnout.lastName.trim(),
    answers: burnout.answers,
    personalDataConsent: burnout.personalDataConsent,
    consentRecordedAt: burnout.consentRecordedAt ?? undefined,
  });
}