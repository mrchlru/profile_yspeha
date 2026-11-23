import { postJsonRequireOnline } from "@/lib/sync/unstableConnection";
import { useFormStore } from "@/store/useFormStore";
import { useProfSbEducationFormStore } from "@/store/useProfSbEducationFormStore";

/** Не используется: сохранение при завершении теста. */
export function queueProfSbEducationAnswersSync(): void {}

/**
 * Сохраняет черновик анкеты ПРОФ СБ на сервер.
 */
export async function syncProfSbEducationAnswersNow(): Promise<void> {
  const prof = useProfSbEducationFormStore.getState();
  const form = useFormStore.getState();
  const accessCode = (prof.accessCodeSnapshot ?? form.validatedAccessCode ?? "").trim();

  if (!prof.sessionId || accessCode.length < 8) {
    return;
  }
  if (prof.firstName.trim().length === 0 || prof.lastName.trim().length === 0) {
    return;
  }

  await postJsonRequireOnline("/api/prof-sb-education/sync-answers", {
    sessionId: prof.sessionId,
    accessCode,
    firstName: prof.firstName.trim(),
    lastName: prof.lastName.trim(),
    answers: prof.answers,
    personalDataConsent: prof.personalDataConsent,
    consentRecordedAt: prof.consentRecordedAt ?? undefined,
  });
}