import { UNSTABLE_CONNECTION_MESSAGE, UnstableConnectionError } from "@/lib/sync/unstableConnection";

/** Текст ошибки для UI при неудачном сохранении шага. */
export function formatStepSaveError(error: unknown): string {
  if (error instanceof UnstableConnectionError) {
    return error.message;
  }
  return UNSTABLE_CONNECTION_MESSAGE;
}