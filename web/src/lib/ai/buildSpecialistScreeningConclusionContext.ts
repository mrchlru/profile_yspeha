import { sanitizeForAiInput } from "@/lib/ai/sanitizeForAi";
import type { SpecialistScreeningScores } from "@/lib/specialistScreening/computeSpecialistScreeningScores";
import type { SpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";

/**
 * Собирает контекст для LLM по скринингу PHQ-9 / GAD-7 / ASRS.
 */
export function buildSpecialistScreeningConclusionContext(input: {
  personName: string;
  scores: SpecialistScreeningScores;
  interpretation: SpecialistScreeningInterpretation;
}): string {
  const safeName = sanitizeForAiInput(input.personName, 120);
  const { scores, interpretation } = input;

  const payload = {
    participantName: safeName,
    testName: "Скрининг депрессивных симптомов (PHQ-9, GAD-7, ASRS v1.1 Part A)",
    disclaimer:
      "ВАЖНО: это опросник-скрининг (PHQ-9/GAD-7/ASRS), не медицинский диагноз и не медицинская карта. " +
      "Результаты — сигналы для HRD/руководства о поддержке и направлении к специалисту. " +
      "Не использовать для клинических формулировок. Решения — с учётом конфиденциальности и закона.",
    screeningOnly: true,
    phq9Item9Positive: scores.phq9Item9Positive,
    phq9Item9Score: scores.phq9Item9Score,
    referralSuggested: interpretation.referralSuggested,
    verdictTitle: interpretation.verdictTitle,
    verdictText: interpretation.verdictText,
    scales: {
      phq9: {
        title: interpretation.phq9.title,
        score: interpretation.phq9.score,
        maxScore: interpretation.phq9.maxScore,
        levelLabel: interpretation.phq9.levelLabel,
        unfavorable: interpretation.phq9.unfavorable,
        note: interpretation.phq9.note,
      },
      gad7: {
        title: interpretation.gad7.title,
        score: interpretation.gad7.score,
        maxScore: interpretation.gad7.maxScore,
        levelLabel: interpretation.gad7.levelLabel,
        unfavorable: interpretation.gad7.unfavorable,
        note: interpretation.gad7.note,
      },
      asrs: {
        title: interpretation.asrs.title,
        positiveCount: interpretation.asrs.score,
        maxPartA: interpretation.asrs.maxScore,
        screenPositive: interpretation.asrsScreenPositive,
        levelLabel: interpretation.asrs.levelLabel,
        unfavorable: interpretation.asrs.unfavorable,
        note: interpretation.asrs.note,
      },
    },
    systemRecommendations: interpretation.recommendationLines,
    answeredCount: scores.answeredCount,
  };

  return JSON.stringify(payload, null, 2);
}
