/** Типы событий прокторинга HR-скрининга. */
export const PROCTOR_EVENT_FACE_MISSING = "face_missing" as const;
export const PROCTOR_EVENT_MULTIPLE_FACES = "multiple_faces" as const;
export const PROCTOR_EVENT_AUDIO_NOISE = "audio_noise" as const;
/** Взгляд или голова отвернуты от экрана (Face Landmarker). */
export const PROCTOR_EVENT_GAZE_AWAY = "gaze_away" as const;
/** Создаётся на сервере при YOLO-перепроверке кадра. */
export const PROCTOR_EVENT_PHONE_DETECTED = "phone_detected" as const;
/** Неверный ответ на проверочный вопрос по анкете (ОД / кадровый резерв). */
export const PROCTOR_EVENT_IDENTITY_CHECK_FAILED = "identity_check_failed" as const;
/** Таймаут или пустой ответ на проверочный вопрос по анкете. */
export const PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT = "identity_check_timeout" as const;

export type ClientProctorEventKind =
  | typeof PROCTOR_EVENT_FACE_MISSING
  | typeof PROCTOR_EVENT_MULTIPLE_FACES
  | typeof PROCTOR_EVENT_AUDIO_NOISE
  | typeof PROCTOR_EVENT_GAZE_AWAY;

export type ProctorEventKind =
  | ClientProctorEventKind
  | typeof PROCTOR_EVENT_PHONE_DETECTED
  | typeof PROCTOR_EVENT_IDENTITY_CHECK_FAILED
  | typeof PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT;

export const PROCTOR_EVENT_KIND_LABELS: Record<ProctorEventKind, string> = {
  face_missing: "Лицо не в кадре",
  multiple_faces: "Несколько людей в кадре",
  audio_noise: "Разговор или посторонний шум",
  gaze_away: "Взгляд или голова отвернуты от экрана",
  phone_detected: "Телефон в кадре",
  identity_check_failed: "Неверный ответ на проверочный вопрос",
  identity_check_timeout: "Не ответил на проверочный вопрос",
};

export type ProctorEventKindCategory = "video" | "audio" | "identity";

/** Возвращает категорию нарушения для отчёта. */
export function proctorEventCategory(kind: ProctorEventKind): ProctorEventKindCategory {
  if (kind === PROCTOR_EVENT_AUDIO_NOISE) {
    return "audio";
  }
  if (
    kind === PROCTOR_EVENT_IDENTITY_CHECK_FAILED ||
    kind === PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT
  ) {
    return "identity";
  }
  return "video";
}

export function isProctorEventKind(value: string): value is ProctorEventKind {
  return (
    value === PROCTOR_EVENT_FACE_MISSING ||
    value === PROCTOR_EVENT_MULTIPLE_FACES ||
    value === PROCTOR_EVENT_AUDIO_NOISE ||
    value === PROCTOR_EVENT_GAZE_AWAY ||
    value === PROCTOR_EVENT_PHONE_DETECTED ||
    value === PROCTOR_EVENT_IDENTITY_CHECK_FAILED ||
    value === PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT
  );
}

/**
 * Читает подпись проверочного вопроса из metadata события прокторинга.
 */
export function identityCheckFieldLabelFromMetadata(metadata: unknown): string | null {
  if (metadata === null || typeof metadata !== "object") {
    return null;
  }
  const label = (metadata as Record<string, unknown>).identityFieldLabel;
  if (typeof label !== "string") {
    return null;
  }
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : null;
}
