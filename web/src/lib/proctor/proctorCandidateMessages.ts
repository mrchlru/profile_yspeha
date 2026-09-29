import type { ProctorEventKind } from "@/lib/proctor/proctorEventKinds";

import {
  PROCTOR_EVENT_AUDIO_NOISE,
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_MULTIPLE_FACES,
  PROCTOR_EVENT_GAZE_AWAY,
  PROCTOR_EVENT_PHONE_DETECTED,
  PROCTOR_EVENT_IDENTITY_CHECK_FAILED,
  PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT,
  PROCTOR_EVENT_TAB_HIDDEN,
  PROCTOR_EVENT_FULLSCREEN_EXIT,
  PROCTOR_EVENT_WINDOW_BLUR,
} from "@/lib/proctor/proctorEventKinds";

/** Полоса скрыта — тишина и нет активных нарушений. */
export const PROCTOR_BANNER_HIDDEN = "";

/** Сообщение при отказе в доступе к камере/микрофону. */
export const PROCTOR_BANNER_DENIED =
  "Разрешите доступ к камере и микрофону в настройках браузера — без этого тест не засчитывается.";

/** Сообщение, пока идёт подключение камеры. */
export const PROCTOR_BANNER_REQUESTING = "Подключаем камеру и микрофон…";

/** Сообщение после устранения нарушения (лицо снова в кадре). */
export const PROCTOR_BANNER_ALL_CLEAR =
  "Продолжайте прохождение теста. Камера и микрофон включены для контроля.";

const KIND_MESSAGES: Record<ProctorEventKind, string> = {
  [PROCTOR_EVENT_FACE_MISSING]:
    "Вернитесь на место и продолжайте прохождение теста. Держите лицо в кадре камеры.",
  [PROCTOR_EVENT_MULTIPLE_FACES]:
    "В кадре должны быть только вы. Уберите посторонних и продолжайте тест.",
  [PROCTOR_EVENT_AUDIO_NOISE]:
    "Не подсказывайте и не разговаривайте во время теста.",
  [PROCTOR_EVENT_GAZE_AWAY]:
    "Смотрите на экран. Не отворачивайтесь и не оглядывайтесь во время теста.",
  [PROCTOR_EVENT_PHONE_DETECTED]:
    "Уберите телефон из кадра и продолжайте прохождение теста.",
  [PROCTOR_EVENT_IDENTITY_CHECK_FAILED]: "",
  [PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT]: "",
  [PROCTOR_EVENT_TAB_HIDDEN]:
    "Не сворачивайте вкладку и не уходите с экрана теста.",
  [PROCTOR_EVENT_FULLSCREEN_EXIT]:
    "Вернитесь в полноэкранный режим и продолжайте тест.",
  [PROCTOR_EVENT_WINDOW_BLUR]:
    "Не переключайтесь на другие окна во время теста.",
};

/** Возвращает текст предупреждения для кандидата по типу нарушения. */
export function proctorCandidateMessageForKind(kind: ProctorEventKind): string {
  return KIND_MESSAGES[kind];
}
