import {
  listSpecialistScreeningSectionQuestions,
  PHQ9_ITEM9_QUESTION_ID,
  type SpecialistScreeningAnswers,
} from "@/lib/specialistScreening/specialistScreeningQuestions";

export type SpecialistScreeningScores = {
  phq9Total: number;
  gad7Total: number;
  asrsPositiveCount: number;
  asrsItemPositive: ReadonlyArray<boolean>;
  phq9Item9Score: number;
  phq9Item9Positive: boolean;
  answeredCount: number;
};

/** ASRS Part A: п.1–3 положительны с «Часто» (3+), п.4–6 — с «Иногда» (2+). */
const ASRS_POSITIVE_THRESHOLDS: ReadonlyArray<number> = [3, 3, 3, 2, 2, 2];

/**
 * Считает суммы PHQ-9 / GAD-7 и положительные пункты ASRS Part A.
 */
export function computeSpecialistScreeningScores(
  answers: SpecialistScreeningAnswers
): SpecialistScreeningScores {
  const phq9Total = _sumSection(answers, "phq9");
  const gad7Total = _sumSection(answers, "gad7");
  const asrsQuestions = listSpecialistScreeningSectionQuestions("asrs");
  const asrsItemPositive = asrsQuestions.map((question, offset) => {
    const value = answers[question.id];
    if (typeof value !== "number") {
      return false;
    }
    const threshold = ASRS_POSITIVE_THRESHOLDS[offset] ?? 3;
    return value >= threshold;
  });
  const asrsPositiveCount = asrsItemPositive.filter(Boolean).length;
  const phq9Item9Raw = answers[PHQ9_ITEM9_QUESTION_ID];
  const phq9Item9Score = typeof phq9Item9Raw === "number" ? phq9Item9Raw : 0;

  return {
    phq9Total,
    gad7Total,
    asrsPositiveCount,
    asrsItemPositive,
    phq9Item9Score,
    phq9Item9Positive: phq9Item9Score > 0,
    answeredCount: _countAnswered(answers),
  };
}

function _sumSection(
  answers: SpecialistScreeningAnswers,
  sectionId: "phq9" | "gad7"
): number {
  let total = 0;
  for (const question of listSpecialistScreeningSectionQuestions(sectionId)) {
    const value = answers[question.id];
    if (typeof value === "number") {
      total += value;
    }
  }
  return total;
}

function _countAnswered(answers: SpecialistScreeningAnswers): number {
  let count = 0;
  for (const value of Object.values(answers)) {
    if (typeof value === "number") {
      count += 1;
    }
  }
  return count;
}
