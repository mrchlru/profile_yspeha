/**
 * Объединяет ответы аудита с сервера и из финального submit (приоритет у клиента по вопросам).
 */
export function mergeAuditSubmitAnswers(
  serverAnswers: Record<string, Record<string, unknown>>,
  clientAnswers: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  const merged: Record<string, Record<string, unknown>> = {
    ...serverAnswers,
  };
  for (const [stepKey, stepAnswers] of Object.entries(clientAnswers)) {
    const prior = merged[stepKey] ?? {};
    merged[stepKey] = { ...prior, ...stepAnswers };
  }
  return merged;
}