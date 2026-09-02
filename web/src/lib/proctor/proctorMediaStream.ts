/** Общий поток камеры и микрофона — один getUserMedia на всё прохождение. */

let sharedStream: MediaStream | null = null;

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

/**
 * Возвращает активный поток прокторинга или запрашивает новый.
 */
export async function ensureProctorMediaStream(): Promise<MediaStream> {
  if (sharedStream !== null && sharedStream.active) {
    return sharedStream;
  }

  sharedStream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
  return sharedStream;
}

/** Есть ли уже подключённый поток (без нового запроса). */
export function hasActiveProctorMediaStream(): boolean {
  return sharedStream !== null && sharedStream.active;
}

/**
 * Останавливает общий поток (конец теста или сброс сессии).
 */
export function stopProctorMediaStream(): void {
  if (sharedStream === null) {
    return;
  }
  sharedStream.getTracks().forEach((track) => track.stop());
  sharedStream = null;
}
