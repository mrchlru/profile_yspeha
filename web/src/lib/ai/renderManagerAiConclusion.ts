/**
 * Склеивает текст заключения ИИ и блок кратких действий для писем и UI.
 */
export function buildManagerAiConclusionText(
  conclusionText: string | null,
  managerActions: string | null
): string {
  const parts: string[] = [];
  if (conclusionText && conclusionText.trim().length > 0) {
    parts.push(conclusionText.trim());
  }
  if (managerActions && managerActions.trim().length > 0) {
    if (parts.length > 0) {
      parts.push("");
    }
    parts.push(managerActions.trim());
  }
  if (parts.length === 0) {
    return "Заключение ИИ не сформировано.";
  }
  return parts.join("\n");
}
