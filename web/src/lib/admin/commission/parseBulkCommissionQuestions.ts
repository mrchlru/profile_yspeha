/**
 * Разбивает массовый ввод вопросов на отдельные строки.
 */
export function parseBulkCommissionQuestionText(rawText: string): string[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const questions: string[] = [];
  for (const line of lines) {
    const cleaned = _stripListPrefix(line);
    if (cleaned.length >= 8) {
      questions.push(cleaned);
    }
  }

  return [...new Set(questions)];
}

function _stripListPrefix(line: string): string {
  return line
    .replace(/^\d+[\).\]:\-–—]\s*/, "")
    .replace(/^[-•*]\s*/, "")
    .replace(/^вопрос\s*\d*\s*[:.\-–—]?\s*/i, "")
    .trim();
}
