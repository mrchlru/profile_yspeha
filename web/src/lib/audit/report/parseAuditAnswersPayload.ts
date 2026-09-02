import type { AuditAnswersMap, AuditStepAnswers } from "@/lib/audit/auditAnswers";

/**
 * Приводит ответы из JSON тела запроса (строковые ключи шагов) к `AuditAnswersMap`.
 */
export function parseAuditAnswersPayload(
  answers: Record<string, Record<string, unknown>>
): AuditAnswersMap {
  const out: AuditAnswersMap = {};
  for (const [stepKey, stepObj] of Object.entries(answers)) {
    const stepIndex = Number(stepKey);
    if (!Number.isInteger(stepIndex) || stepIndex < 1) {
      continue;
    }
    out[stepIndex] = stepObj as AuditStepAnswers;
  }
  return out;
}
