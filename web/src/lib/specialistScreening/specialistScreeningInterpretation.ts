import type { SpecialistScreeningScores } from "@/lib/specialistScreening/computeSpecialistScreeningScores";

export type Phq9SeverityLevel =
  | "none"
  | "mild"
  | "moderate"
  | "moderately_severe"
  | "severe";

export type Gad7SeverityLevel = "minimal" | "mild" | "moderate" | "severe";

export type SpecialistScaleInterpretation = {
  key: "phq9" | "gad7" | "asrs";
  title: string;
  score: number;
  maxScore: number;
  level: string;
  levelLabel: string;
  unfavorable: boolean;
  note: string;
};

export type SpecialistScreeningInterpretation = {
  phq9: SpecialistScaleInterpretation;
  gad7: SpecialistScaleInterpretation;
  asrs: SpecialistScaleInterpretation;
  asrsScreenPositive: boolean;
  phq9Item9Positive: boolean;
  verdictTitle: string;
  verdictText: string;
  recommendationLines: string[];
  referralSuggested: boolean;
};

/**
 * Строит текстовую интерпретацию по трём шкалам скрининга.
 */
export function buildSpecialistScreeningInterpretation(
  scores: SpecialistScreeningScores
): SpecialistScreeningInterpretation | null {
  if (scores.answeredCount < 22) {
    return null;
  }

  const phq9Level = _phq9Level(scores.phq9Total);
  const gad7Level = _gad7Level(scores.gad7Total);
  const asrsScreenPositive = scores.asrsPositiveCount >= 4;

  const phq9: SpecialistScaleInterpretation = {
    key: "phq9",
    title: "PHQ-9 (депрессия)",
    score: scores.phq9Total,
    maxScore: 27,
    level: phq9Level,
    levelLabel: _phq9LevelLabel(phq9Level),
    unfavorable: scores.phq9Total >= 10 || scores.phq9Item9Positive,
    note: "Сумма 0–27. Порог клинического внимания обычно ≥10.",
  };

  const gad7: SpecialistScaleInterpretation = {
    key: "gad7",
    title: "GAD-7 (тревога)",
    score: scores.gad7Total,
    maxScore: 21,
    level: gad7Level,
    levelLabel: _gad7LevelLabel(gad7Level),
    unfavorable: scores.gad7Total >= 10,
    note: "Сумма 0–21. Порог клинического внимания обычно ≥10.",
  };

  const asrs: SpecialistScaleInterpretation = {
    key: "asrs",
    title: "ASRS v1.1 часть A (СДВГ)",
    score: scores.asrsPositiveCount,
    maxScore: 6,
    level: asrsScreenPositive ? "positive" : "negative",
    levelLabel: asrsScreenPositive
      ? "Скрининг положительный"
      : "Скрининг отрицательный",
    unfavorable: asrsScreenPositive,
    note: "Положительный скрининг при ≥4 положительных ответах из 6.",
  };

  const referralSuggested =
    phq9.unfavorable || gad7.unfavorable || asrs.unfavorable || scores.phq9Item9Positive;

  const { verdictTitle, verdictText, recommendationLines } = _buildVerdict({
    phq9,
    gad7,
    asrs,
    asrsScreenPositive,
    phq9Item9Positive: scores.phq9Item9Positive,
    referralSuggested,
  });

  return {
    phq9,
    gad7,
    asrs,
    asrsScreenPositive,
    phq9Item9Positive: scores.phq9Item9Positive,
    verdictTitle,
    verdictText,
    recommendationLines,
    referralSuggested,
  };
}

function _phq9Level(total: number): Phq9SeverityLevel {
  if (total <= 4) return "none";
  if (total <= 9) return "mild";
  if (total <= 14) return "moderate";
  if (total <= 19) return "moderately_severe";
  return "severe";
}

function _phq9LevelLabel(level: Phq9SeverityLevel): string {
  switch (level) {
    case "none":
      return "Минимальные симптомы / отсутствует";
    case "mild":
      return "Лёгкая степень";
    case "moderate":
      return "Умеренная степень";
    case "moderately_severe":
      return "Умеренно тяжёлая степень";
    case "severe":
      return "Тяжёлая степень";
  }
}

function _gad7Level(total: number): Gad7SeverityLevel {
  if (total <= 4) return "minimal";
  if (total <= 9) return "mild";
  if (total <= 14) return "moderate";
  return "severe";
}

function _gad7LevelLabel(level: Gad7SeverityLevel): string {
  switch (level) {
    case "minimal":
      return "Минимальная тревога";
    case "mild":
      return "Лёгкая тревога";
    case "moderate":
      return "Умеренная тревога";
    case "severe":
      return "Тяжёлая тревога";
  }
}

function _buildVerdict(input: {
  phq9: SpecialistScaleInterpretation;
  gad7: SpecialistScaleInterpretation;
  asrs: SpecialistScaleInterpretation;
  asrsScreenPositive: boolean;
  phq9Item9Positive: boolean;
  referralSuggested: boolean;
}): {
  verdictTitle: string;
  verdictText: string;
  recommendationLines: string[];
} {
  if (input.phq9Item9Positive) {
    return {
      verdictTitle: "Срочный сигнал по вопросу 9 PHQ-9",
      verdictText:
        "Ответ на вопрос о мыслях о смерти или причинении себе вреда отличается от «Никогда». Это не статистика, а сигнал для немедленного конфиденциального действия в тот же день: разговор и предложение сопровождения к специалисту или горячей линии 8-800-2000-122.",
      recommendationLines: [
        "Организуйте конфиденциальный разговор в тот же день.",
        "Предложите сопровождение к психиатру/психотерапевту или горячую линию экстренной психологической помощи 8-800-2000-122.",
        "Не оставляйте ответ «на потом» и не передавайте информацию никому, кроме врача, ведущего сопровождение.",
      ],
    };
  }

  if (!input.referralSuggested) {
    return {
      verdictTitle: "Направление к специалисту не показано по порогам скрининга",
      verdictText:
        "Показатели PHQ-9, GAD-7 и ASRS ниже порогов, обычно используемых для направления. Результат не является диагнозом.",
      recommendationLines: [
        "При ухудшении самочувствия сотрудник может повторно пройти скрининг или обратиться к специалисту.",
      ],
    };
  }

  const parts: string[] = [];
  if (input.phq9.unfavorable) {
    parts.push(`PHQ-9: ${input.phq9.levelLabel} (${String(input.phq9.score)}/27)`);
  }
  if (input.gad7.unfavorable) {
    parts.push(`GAD-7: ${input.gad7.levelLabel} (${String(input.gad7.score)}/21)`);
  }
  if (input.asrsScreenPositive) {
    parts.push(
      `ASRS: положительный скрининг (${String(input.asrs.score)} из 6 положительных ответов)`
    );
  }

  return {
    verdictTitle: "Рекомендуется направление к специалисту",
    verdictText: `По результатам скрининга есть основания для направления: ${parts.join("; ")}. Это скрининг, а не клинический диагноз.`,
    recommendationLines: [
      "Обсудите результат конфиденциально с сотрудником.",
      "Предложите консультацию психиатра/психотерапевта или клинического психолога.",
      "При необходимости повторите скрининг после консультации специалиста.",
    ],
  };
}
