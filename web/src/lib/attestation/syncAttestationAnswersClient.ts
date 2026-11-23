import { postJsonRequireOnline } from "@/lib/sync/unstableConnection";
import { useFormStore } from "@/store/useFormStore";
import { useAttestationFormStore } from "@/store/useAttestationFormStore";

/** Не используется: сохранение при завершении теста. */
export function queueAttestationAnswersSync(): void {}

/**
 * Сохраняет ответы аттестации на сервер перед финишем.
 */
export async function syncAttestationAnswersNow(): Promise<void> {
  const attestation = useAttestationFormStore.getState();
  const form = useFormStore.getState();
  const accessCode = (attestation.accessCodeSnapshot ?? form.validatedAccessCode ?? "").trim();

  if (!attestation.sessionId || accessCode.length < 8) {
    return;
  }
  if (
    attestation.firstName.trim().length === 0 ||
    attestation.lastName.trim().length === 0 ||
    attestation.jobTitle.trim().length < 2
  ) {
    return;
  }
  if (Object.keys(attestation.answers).length === 0) {
    return;
  }

  await postJsonRequireOnline("/api/attestation/sync-answers", {
    sessionId: attestation.sessionId,
    accessCode,
    firstName: attestation.firstName.trim(),
    lastName: attestation.lastName.trim(),
    jobTitle: attestation.jobTitle.trim(),
    answers: attestation.answers,
    personalDataConsent: attestation.personalDataConsent,
    consentRecordedAt: attestation.consentRecordedAt ?? undefined,
  });
}