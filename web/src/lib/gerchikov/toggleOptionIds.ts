/**
 * Переключение выбора id опций с ограничением по количеству.
 */
export function toggleOptionIdWithMax(
  current: string[],
  optionId: string,
  maxSelected: number
): string[] {
  if (current.includes(optionId)) {
    return current.filter((id) => id !== optionId);
  }
  if (current.length >= maxSelected) {
    return current;
  }
  return [...current, optionId];
}

/**
 * Переключение без верхней границы (все варианты из списка могут быть отмечены).
 */
export function toggleOptionIdUnlimited(current: string[], optionId: string): string[] {
  if (current.includes(optionId)) {
    return current.filter((id) => id !== optionId);
  }
  return [...current, optionId];
}
