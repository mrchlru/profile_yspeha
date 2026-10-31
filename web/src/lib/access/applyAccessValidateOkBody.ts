import { stopProctorMediaStream } from "@/lib/proctor/proctorMediaStream";
import { useFormStore } from "@/store/useFormStore";

/** Успешный ответ POST `/api/access/validate` (поля, влияющие на клиент). */
export type AccessValidateOkBody = {
  devMode?: boolean;
  avProctorDisabled?: boolean;
  candidateFirstName?: string;
  candidateLastName?: string;
};

/**
 * Синхронизирует флаги приглашения из ответа validate (камера/микрофон, dev, ФИО).
 * Вызывать при каждом успешном validate, не только при первом вводе кода.
 */
export function applyAccessValidateOkBody(body: AccessValidateOkBody): void {
  const avDisabled = body.avProctorDisabled === true;
  useFormStore.setState((state) => ({
    activeInviteDevMode: body.devMode === true,
    activeInviteAvProctorDisabled: avDisabled,
    accessInviteSettingsSynced: true,
    inviteCandidateFirstName:
      body.candidateFirstName?.trim() || state.inviteCandidateFirstName,
    inviteCandidateLastName:
      body.candidateLastName?.trim() || state.inviteCandidateLastName,
    ...(avDisabled ? { proctorMediaGranted: false } : {}),
  }));
  if (avDisabled) {
    stopProctorMediaStream();
  }
}
