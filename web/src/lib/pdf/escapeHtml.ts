/**
 * Экранирование текста для безопасной вставки в HTML/PDF-шаблоны (защита от XSS).
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Превращает произвольную строку в безопасный для HTML текст.
 */
export function escapeHtmlForPdf(raw: string): string {
  return raw.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}
