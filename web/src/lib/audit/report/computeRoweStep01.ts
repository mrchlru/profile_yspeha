import type { AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { computeRoweStyleScores } from "@/lib/audit/report/computeAuditMethodologyScores";

/**
 * Сводка по шагу 1 (пары Rowe): число закрытых пар.
 */
export function computeRoweStep01Summary(
  answers: AuditStepAnswers | undefined
): { pairsAnswered: number; pairsTotal: number } {
  const rowe = computeRoweStyleScores(answers);
  return { pairsAnswered: rowe.pairsAnswered, pairsTotal: rowe.pairsTotal };
}

export { computeRoweStyleScores } from "@/lib/audit/report/computeAuditMethodologyScores";
