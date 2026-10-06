import { sanitizeForAiInput } from "@/lib/ai/sanitizeForAi";
import type { SpecialistScreeningScores } from "@/lib/specialistScreening/computeSpecialistScreeningScores";
import type { SpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import {
  SPECIALIST_SCREENING_SCALES_HINT,
  buildSpecialistScaleDetails,
} from "@/lib/specialistScreening/specialistScreeningScaleDetails";

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
  const scaleDetails = buildSpecialistScaleDetails([
    interpretation.phq9,
    interpretation.gad7,
    interpretation.asrs,
  ]);

  const payload = {
    participantName: safeName,
    testName: "Скрининг депрессивных симптомов (PHQ-9, GAD-7, ASRS v1.1 Part A)",
    disclaimer:
      "ВАЖНО: это опросник-скрининг (PHQ-9/GAD-7/ASRS), не медицинский диагноз и не медицинская карта. " +
      "Результаты — сигналы для HRD/руководства о поддержке и направлении к специалисту. " +
      "Не использовать для клинических формулировок. Решения — с учётом конфиденциальности и закона.",
    screeningOnly: true,
    scalesHint: SPECIALIST_SCREENING_SCALES_HINT,
    phq9Item9Positive: scores.phq9Item9Positive,
    phq9Item9Score: scores.phq9Item9Score,
    referralSuggested: interpretation.referralSuggested,
    verdictTitle: interpretation.verdictTitle,
    verdictText: interpretation.verdictText,
    scales: scaleDetails.map((item) => ({
      key: item.key,
      title: item.title,
      score: item.score,
      maxScore: item.maxScore,
      percentOfMax: item.percent,
      levelLabel: item.levelLabel,
      unfavorable: item.unfavorable,
      meaning: item.meaning,
      interpretation: item.levelText,
      note: item.note,
    })),
    systemRecommendations: interpretation.recommendationLines,
    answeredCount: scores.answeredCount,
  };

  return JSON.stringify(payload, null, 2);
}
