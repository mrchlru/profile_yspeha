/**
 * Собирает компактное ИИ-заключение скрининга для PDF и email.
 */
export function buildScreeningAiConclusionText(
  conclusion: string | null,
  hiringRecommendations: string | null
): string {
  const parts: string[] = [];

  if (conclusion !== null && conclusion.trim().length > 0) {
    parts.push(conclusion.trim());
  }
  if (hiringRecommendations !== null && hiringRecommendations.trim().length > 0) {
    if (parts.length > 0) {
      parts.push("");
    }
    parts.push(hiringRecommendations.trim());
  }

  if (parts.length === 0) {
    return "Заключение не сгенерировано (нет ключа OpenAI или ошибка модели).";
  }

  return parts.join("\n");
}

/** Заголовки разделов compact-заключения — выделяются в PDF. */
export function isScreeningConclusionSectionHeader(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) {
    return false;
  }
  const known = [
    "О КАНДИДАТЕ",
    "ПРОФЕССИОНАЛЬНЫЕ И ЛИЧНОСТНЫЕ КАЧЕСТВА",
    "РЕКОМЕНДУЕМЫЕ НАПРАВЛЕНИЯ ДЕЯТЕЛЬНОСТИ",
    "КРАТКО ДЛЯ HR",
  ];
  if (known.includes(t)) {
    return true;
  }
  return t.length >= 8 && t.length <= 80 && t === t.toUpperCase() && /[А-ЯЁA-Z]/.test(t);
}
