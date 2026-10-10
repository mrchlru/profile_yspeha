/**
 * Обрезает текст ИИ без разрыва слова: по последнему абзацу / предложению в лимите.
 */
export function clampAiPlainText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) {
    return trimmed;
  }

  const hard = trimmed.slice(0, maxLen);
  const paragraphBreak = Math.max(hard.lastIndexOf("\n\n"), hard.lastIndexOf("\n"));
  if (paragraphBreak >= Math.floor(maxLen * 0.6)) {
    return hard.slice(0, paragraphBreak).trimEnd();
  }

  const sentenceBreak = Math.max(
    hard.lastIndexOf(". "),
    hard.lastIndexOf("! "),
    hard.lastIndexOf("? "),
    hard.lastIndexOf(".\n")
  );
  if (sentenceBreak >= Math.floor(maxLen * 0.5)) {
    return hard.slice(0, sentenceBreak + 1).trimEnd();
  }

  const spaceBreak = hard.lastIndexOf(" ");
  if (spaceBreak >= Math.floor(maxLen * 0.5)) {
    return hard.slice(0, spaceBreak).trimEnd();
  }

  return hard.trimEnd();
}

/**
 * Убирает дублирующий заголовок «КРАТКО ДЛЯ РУКОВОДИТЕЛЯ» из managerActions —
 * в UI он уже выводится отдельно.
 */
export function stripManagerActionsHeading(text: string): string {
  return text
    .replace(/^\s*кратко\s+для\s+руководителя\s*:?\s*/i, "")
    .replace(/^\s*КРАТКО\s+ДЛЯ\s+РУКОВОДИТЕЛЯ\s*:?\s*/u, "")
    .trim();
}
