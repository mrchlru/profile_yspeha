import { postJsonRequireOnline } from "@/lib/sync/unstableConnection";
import { useFormStore } from "@/store/useFormStore";
import { useSpecialistScreeningFormStore } from "@/store/useSpecialistScreeningFormStore";

/** Не используется: сохранение при завершении теста. */
export function queueSpecialistScreeningAnswersSync(): void {}

/**
 * Сохраняет ответы скрининга специалиста на сервер перед финишем.
 */
export async function syncSpecialistScreeningAnswersNow(): Promise<void> {
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

  await postJsonRequireOnline("/api/specialist-screening/sync-answers", {
    sessionId: screening.sessionId,
    accessCode,
    firstName: screening.firstName.trim(),
    lastName: screening.lastName.trim(),
    answers: screening.answers,
    personalDataConsent: screening.personalDataConsent,
    consentRecordedAt: screening.consentRecordedAt ?? undefined,
  });
}