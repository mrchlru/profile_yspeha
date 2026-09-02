/**
 * Подготовка пользовательских строк (шаг 4) к передаче в LLM: обрезка и удаление опасных символов.
 * Сохраняет буквы всех алфавитов (Unicode) и цифры.
 */

const DEFAULT_MAX_LEN = 200;

/**
 * Обрезает строку и оставляет только символы категорий Letter и Number.
 */
export function sanitizeForAiInput(input: string, maxLen: number = DEFAULT_MAX_LEN): string {
  const sliced = input.slice(0, maxLen);
  return sliced.replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Обрезает строку для передачи в LLM без изменения знаков препинания
 * (нужно для JSON и структурированного контекста).
 */
export function truncateForAiContext(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}…`;
}
