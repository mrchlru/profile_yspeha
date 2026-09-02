import type { AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { computeMaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { buildMaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";
import {
  coerceMaslachBurnoutAnswer,
  MASLACH_BURNOUT_QUESTION_COUNT,
  type MaslachBurnoutAnswers,
} from "@/lib/burnout/maslachBurnoutQuestions";

/**
 * Преобразует ответы шага аудита (Маслач MBI) в формат standalone-теста.
 */
export function auditStepAnswersToMaslachAnswers(
  stepAnswers: AuditStepAnswers | undefined
): MaslachBurnoutAnswers | null {
  if (stepAnswers === undefined) {
    return null;
  }
  const out: MaslachBurnoutAnswers = {};
  for (let index = 1; index <= MASLACH_BURNOUT_QUESTION_COUNT; index += 1) {
    const raw = stepAnswers[`q${String(index)}`];
    const value =
      typeof raw === "number"
        ? coerceMaslachBurnoutAnswer(raw)
        : coerceMaslachBurnoutAnswer(
            typeof raw === "string" && raw.trim().length > 0 ? Number(raw) : null
          );
    if (value !== null) {
      out[`q${String(index)}`] = value;
    }
  }
  return out;
}

/**
 * Считает баллы и интерпретацию MBI по ответам шага 25 аудита.
 */
export function computeMaslachMbiFromAuditStep(stepAnswers: AuditStepAnswers | undefined): {
  scores: ReturnType<typeof computeMaslachBurnoutScores>;
  interpretation: ReturnType<typeof buildMaslachBurnoutInterpretation> | null;
} {
  const maslachAnswers = auditStepAnswersToMaslachAnswers(stepAnswers);
  const scores = computeMaslachBurnoutScores(maslachAnswers);
  const interpretation =
    scores.ee !== null && scores.dp !== null && scores.pa !== null
      ? buildMaslachBurnoutInterpretation(scores)
      : null;
  return { scores, interpretation };
}
