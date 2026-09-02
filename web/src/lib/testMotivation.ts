/**
 * Мотивационные фразы и подписи кнопок «вперёд» в зависимости от числа отвеченных вопросов.
 * Смена мотивации каждые 6 ответов (сегменты 0–5, 6–11, …).
 */

const MOTIVATION_SEGMENTS = 5;

const MOTIVATION_LINES: ReadonlyArray<(name: string) => string> = [
  (name) => `${name}, осталось ещё немного — вы на правильном пути.`,
  (name) => `${name}, вы уже движетесь вперёд — так держать.`,
  (name) => `${name}, у вас уже отличный прогресс.`,
  (name) => `${name}, почти финишная прямая.`,
  (name) => `${name}, осталось совсем чуть-чуть.`,
];

const CONTINUE_LABELS: ReadonlyArray<string> = [
  "Идём дальше",
  "Вот-вот познакомимся",
  "Продолжаем знакомство",
  "Ещё немного — и мы поближе",
  "Завершаем знакомство",
];

function _segmentIndex(answeredCount: number): number {
  const raw = Math.floor(answeredCount / 6);
  return Math.min(MOTIVATION_SEGMENTS - 1, Math.max(0, raw));
}

function _displayName(profileName: string): string {
  const trimmed = profileName.trim();
  return trimmed.length > 0 ? trimmed : "Вы";
}

/**
 * Индекс сегмента (0..4) по числу отвеченных вопросов; меняется каждые 6 ответов.
 */
export function getMotivationSegmentIndex(answeredCount: number): number {
  return _segmentIndex(answeredCount);
}

/**
 * Мотивационная строка с обращением по имени.
 */
export function getMotivationLine(
  profileName: string,
  answeredCount: number
): string {
  const index = _segmentIndex(answeredCount);
  const name = _displayName(profileName);
  return MOTIVATION_LINES[index](name);
}

/**
 * Текст основной кнопки перехода между блоками вопросов (шаги 1–3).
 */
export function getContinueButtonLabel(answeredCount: number): string {
  const index = _segmentIndex(answeredCount);
  return CONTINUE_LABELS[index] ?? CONTINUE_LABELS[0];
}
