import type { AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { normalizeAuditCfitChoice } from "@/lib/audit/questions/cfit/cfitSubtestItems";
import { AUDIT_STEP_01_PAIRS } from "@/lib/audit/questions/step01Pairs";
import { AUDIT_STEP_03_QUESTIONS } from "@/lib/audit/questions/step03Likert4";
import {
  AUDIT_STEP_21_QUESTIONS,
  type AuditStep21Question,
} from "@/lib/audit/questions/step21Gerchikov";
import { AUDIT_STEP_18_PAIRS } from "@/lib/audit/questions/step18KeirseyPairs";
import { AUDIT_STEP_23_QUESTIONS } from "@/lib/audit/questions/step23YesNo";
import { AUDIT_STEP_24_QUESTIONS } from "@/lib/audit/questions/step24Erudition";
import {
  CFIT_ANSWER_KEYS,
  ERUDITION_INTERPRETATION_BANDS,
  ERUDITION_METHODOLOGY_INTRO,
  ERUDITION_OFFICIAL_TITLE,
  GERCHIKOV_KEY_TABLE,
  GERCHIKOV_METHODOLOGY_INTRO,
  GERCHIKOV_STIMULATION_FORM_LABELS,
  GERCHIKOV_STIMULATION_LEVEL_NOTE,
  GERCHIKOV_STIMULATION_TABLE,
  GERCHIKOV_CONCLUSION_DESCRIPTIONS,
  GERCHIKOV_CONCLUSION_TYPE_LABELS,
  GERCHIKOV_TYPE_SHORT_LABELS,
  type GerchikovStimulationForm,
  type GerchikovStimulationLevel,
  GOAL_PURSUIT_INTERPRETATION_BANDS,
  GOAL_PURSUIT_SCORES,
  KEIRSEY_EI_A_ITEMS,
  KEIRSEY_JP_A_ITEMS,
  KEIRSEY_SN_A_ITEMS,
  KEIRSEY_BRIGHTNESS_DESCRIPTION,
  KEIRSEY_DIMENSION_DESCRIPTIONS,
  KEIRSEY_TEMPERAMENT_DESCRIPTIONS,
  KEIRSEY_TEMPERAMENT_LABELS,
  KEIRSEY_TEMPERAMENT_VALUES,
  KEIRSEY_TF_A_ITEMS,
  KEIRSEY_TYPE_LABELS,
  KEIRSEY_TYPE_PORTRAIT_TEXT,
  KOS_COMM_NO_ITEMS,
  KOS_COMM_SCALE_BANDS,
  KOS_COMM_YES_ITEMS,
  KOS_GRADE_INTERPRETATIONS,
  KOS_METHODOLOGY_INTRO,
  KOS_METHODOLOGY_NOTE,
  KOS_OFFICIAL_TITLE,
  KOS_ORG_NO_ITEMS,
  KOS_ORG_SCALE_BANDS,
  KOS_ORG_YES_ITEMS,
  PAPERWORK_BALANCED,
  PAPERWORK_GROUP1_HIGH,
  PAPERWORK_GROUP1_WITH_GROUP4,
  PAPERWORK_GROUP2_HIGH,
  PAPERWORK_GROUP3_HIGH,
  PAPERWORK_GROUP4_HIGH,
  PAPERWORK_GROUP4_LOW,
  PAPERWORK_LIKERT_SCORES,
  POCHEBUT_GRADE_TO_SCORE,
  POCHEBUT_INTERPRETATION_BANDS,
  POCHEBUT_METHODOLOGY_INTRO,
  POCHEBUT_OFFICIAL_TITLE,
  POCHEBUT_SCORED_ITEMS,
  type PochebutLoyaltyLevel,
  ROTTER_BACKGROUND_PAIRS,
  ROTTER_EXTERNAL_ANSWER_A,
  ROTTER_EXTERNAL_ANSWER_B,
  ROTTER_EXTERNAL_DESCRIPTION,
  ROTTER_INTERNAL_DESCRIPTION,
  ROTTER_METHODOLOGY_INTRO,
  ROTTER_SUMMARY_NOTE,
  ROWE_STYLE_ITEMS,
  ROWE_STYLE_INTERPRETATIONS,
  ROWE_STYLE_LABELS,
  SNYDER_FALSE_KEYED_ITEMS,
  SNYDER_INTERPRETATION_BANDS,
  SNYDER_TRUE_KEYED_ITEMS,
  THOMAS_KILMANN_PAIR_KEY,
  THOMAS_KILMANN_STYLE_LABELS,
  THOMAS_KILMANN_STYLE_ALIASES,
  THOMAS_KILMANN_STYLE_DESCRIPTIONS,
  THOMAS_KILMANN_MODEL_DESCRIPTION,
  THOMAS_KILMANN_CONFLICT_FORMULA_DESCRIPTION,
  TOLERANCE_FACTOR_ITN1_ITEMS,
  TOLERANCE_FACTOR_MITN_ITEMS,
  TOLERANCE_FACTOR_TN_ITEMS,
  TOLERANCE_FACTOR_BANDS,
  TOLERANCE_FACTOR_DESCRIPTIONS,
  TOLERANCE_INVERT_ITEMS,
  TYPE_A_NO_SCORE,
  TYPE_A_PROFILE_DESCRIPTION,
  TYPE_A_UNKNOWN_SCORE,
  TYPE_A_YES_SCORE,
  TYPE_B_PROFILE_DESCRIPTION,
  type GerchikovMotivationType,
  type KeirseyTemperament,
  type RoweStyleId,
  type ThomasKilmannStyle,
} from "@/lib/audit/report/keys/auditScoringKeys";
import { TYPE_A_INTERPRETATION_BANDS } from "@/lib/audit/report/keys/auditScoringKeys";
import { SHUBERT_INTERPRETATION_BANDS } from "@/lib/audit/report/keys/auditScoringKeys";

export type RoweStyleScores = {
  pairsAnswered: number;
  pairsTotal: number;
  styleCounts: Record<RoweStyleId, number>;
  dominantStyle: RoweStyleId | null;
  /** Все стили с максимальным баллом (при равенстве — оба). */
  dominantStyles: ReadonlyArray<RoweStyleId>;
};

/**
 * Тест 1 (Rowe): подсчёт выбранных утверждений по 4 стилям.
 */
export function computeRoweStyleScores(
  answers: AuditStepAnswers | undefined
): RoweStyleScores {
  const styleCounts: Record<RoweStyleId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const itemToStyle = _buildRoweItemStyleMap();
  let pairsAnswered = 0;
  if (answers) {
    for (const pair of AUDIT_STEP_01_PAIRS) {
      const raw = answers[`q${String(pair.index)}`];
      if (raw !== "a" && raw !== "b") {
        continue;
      }
      pairsAnswered += 1;
      const itemIndex = raw === "a" ? pair.itemAIndex : pair.itemBIndex;
      const style = itemToStyle.get(itemIndex);
      if (style !== undefined) {
        styleCounts[style] += 1;
      }
    }
  }
  const dominantStyles = _roweDominantStyles(styleCounts);
  const dominantStyle = dominantStyles[0] ?? null;
  return {
    pairsAnswered,
    pairsTotal: AUDIT_STEP_01_PAIRS.length,
    styleCounts,
    dominantStyle,
    dominantStyles,
  };
}

export type GoalPursuitScores = {
  sum: number | null;
  answered: number;
  level: "low" | "mid" | "high" | null;
  bandLabel: string | null;
  description: string | null;
};

/** Тест 2 — сумма баллов и уровень 10–16 / 17–23 / 24–30. */
export function computeGoalPursuitScores(
  answers: AuditStepAnswers | undefined
): GoalPursuitScores {
  const empty: GoalPursuitScores = {
    sum: null,
    answered: 0,
    level: null,
    bandLabel: null,
    description: null,
  };
  if (!answers) {
    return empty;
  }
  let sum = 0;
  let answered = 0;
  for (let i = 1; i <= 10; i += 1) {
    const raw = answers[`q${String(i)}`];
    if (raw === "a" || raw === "b" || raw === "v") {
      sum += GOAL_PURSUIT_SCORES[raw][i - 1] ?? 0;
      answered += 1;
    }
  }
  if (answered < 10) {
    return {
      sum: answered > 0 ? sum : null,
      answered,
      level: null,
      bandLabel: null,
      description: null,
    };
  }
  let level: GoalPursuitScores["level"] = "mid";
  if (sum <= 16) {
    level = "low";
  } else if (sum >= 24) {
    level = "high";
  }
  const band = _goalPursuitBandForSum(sum);
  return {
    sum,
    answered,
    level,
    bandLabel: band?.label ?? null,
    description: band?.description ?? null,
  };
}

/** Текст интерпретации Теста 2 по результатам подсчёта. */
export function goalPursuitInterpretation(scores: GoalPursuitScores): string {
  if (scores.bandLabel !== null && scores.description !== null) {
    return `${scores.bandLabel}. ${scores.description}`;
  }
  return "Недостаточно данных для интерпретации (нужны ответы на все 10 вопросов).";
}

export type PaperworkGroupScores = {
  groupScores: Record<1 | 2 | 3 | 4, number>;
  answered: number;
  profiles: string[];
  interpretationParts: ReadonlyArray<string>;
};

/** Тест 3 — суммы по 4 группам и интерпретация по ключу заказчика. */
export function computePaperworkScores(
  answers: AuditStepAnswers | undefined
): PaperworkGroupScores {
  const groupScores: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let answered = 0;
  if (answers) {
    for (const q of AUDIT_STEP_03_QUESTIONS) {
      const raw = answers[`q${String(q.index)}`];
      if (raw === "a" || raw === "b" || raw === "v" || raw === "g") {
        groupScores[q.group] += PAPERWORK_LIKERT_SCORES[raw];
        answered += 1;
      }
    }
  }
  const profiles = _paperworkProfiles(groupScores);
  const interpretationParts =
    answered >= AUDIT_STEP_03_QUESTIONS.length
      ? _paperworkInterpretationParts(groupScores)
      : [];
  return { groupScores, answered, profiles, interpretationParts };
}

/** Полный текст интерпретации Теста 3. */
export function paperworkInterpretation(scores: PaperworkGroupScores): string {
  if (scores.interpretationParts.length === 0) {
    return "Недостаточно данных для интерпретации (нужны ответы на все 12 утверждений).";
  }
  return scores.interpretationParts.join(" ");
}

export type SnyderScores = {
  score: number | null;
  answered: number;
  level: "low" | "mid" | "high" | null;
  bandLabel: string | null;
  description: string | null;
};

/** Тест 4 (ОСКСВО) — совпадения с ключом, интерпретация <8 / 8–17 / 17–25. */
export function computeSnyderScores(answers: AuditStepAnswers | undefined): SnyderScores {
  const empty: SnyderScores = {
    score: null,
    answered: 0,
    level: null,
    bandLabel: null,
    description: null,
  };
  if (!answers) {
    return empty;
  }
  let score = 0;
  let answered = 0;
  for (let i = 1; i <= 25; i += 1) {
    const raw = answers[`q${String(i)}`];
    if (raw !== "true" && raw !== "false") {
      continue;
    }
    answered += 1;
    const matches =
      (SNYDER_TRUE_KEYED_ITEMS.has(i) && raw === "true") ||
      (SNYDER_FALSE_KEYED_ITEMS.has(i) && raw === "false");
    if (matches) {
      score += 1;
    }
  }
  if (answered < 25) {
    return {
      score: answered > 0 ? score : null,
      answered,
      level: null,
      bandLabel: null,
      description: null,
    };
  }
  let level: SnyderScores["level"] = "mid";
  if (score < 8) {
    level = "low";
  } else if (score >= 17) {
    level = "high";
  }
  const band = _snyderBandForScore(score);
  return {
    score,
    answered,
    level,
    bandLabel: band?.label ?? null,
    description: band?.description ?? null,
  };
}

/** Полный текст интерпретации Теста 4. */
export function snyderInterpretation(scores: SnyderScores): string {
  if (scores.bandLabel !== null && scores.description !== null) {
    return `${scores.bandLabel}. ${scores.description}`;
  }
  return "Недостаточно данных для интерпретации (нужны ответы на все 25 утверждений).";
}

export type SchubertScores = {
  sum: number | null;
  answered: number;
  level: "low" | "mid" | "high" | null;
  bandLabel: string | null;
  description: string | null;
};

/** Тест 5 (Шуберт) — сумма −50..+50, пороги <−30 / −10..+10 / >+20. */
export function computeSchubertScores(answers: AuditStepAnswers | undefined): SchubertScores {
  const empty: SchubertScores = {
    sum: null,
    answered: 0,
    level: null,
    bandLabel: null,
    description: null,
  };
  if (!answers) {
    return empty;
  }
  let sum = 0;
  let answered = 0;
  for (let i = 1; i <= 25; i += 1) {
    const raw = answers[`q${String(i)}`];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      sum += raw;
      answered += 1;
    }
  }
  if (answered < 25) {
    return {
      sum: answered > 0 ? sum : null,
      answered,
      level: null,
      bandLabel: null,
      description: null,
    };
  }
  let level: SchubertScores["level"] = "mid";
  if (sum < -30) {
    level = "low";
  } else if (sum > 20) {
    level = "high";
  }
  const band =
    SHUBERT_INTERPRETATION_BANDS.find((entry) => sum >= entry.min && sum <= entry.max) ?? null;
  return {
    sum,
    answered,
    level,
    bandLabel: band?.label ?? null,
    description: band?.description ?? null,
  };
}

/** Полный текст интерпретации Теста 5. */
export function schubertInterpretation(scores: SchubertScores): string {
  if (scores.bandLabel !== null && scores.description !== null) {
    return `${scores.bandLabel}. ${scores.description}`;
  }
  if (scores.sum === null) {
    return "Недостаточно данных для интерпретации (нужны ответы на все 25 вопросов).";
  }
  if (scores.sum >= -30 && scores.sum <= -11) {
    return (
      `Сумма ${String(scores.sum)} баллов — промежуточное значение между «слишком осторожны» ` +
      "(менее −30) и «средние значения» (−10…+10)."
    );
  }
  if (scores.sum >= 11 && scores.sum <= 20) {
    return (
      `Сумма ${String(scores.sum)} баллов — промежуточное значение между «средние значения» ` +
      "(−10…+10) и «склонны к риску» (свыше +20)."
    );
  }
  return "Недостаточно данных для интерпретации (нужны ответы на все 25 вопросов).";
}

export type TypeAScores = {
  sum: number | null;
  answered: number;
  profile: "type_a" | "type_a_tendency" | "type_b_tendency" | "type_b" | null;
  bandLabel: string | null;
  description: string | null;
};

/** Тест 6 — 0–10 тип Б, 10–20 склонность Б, 20–30 склонность А, 30–40 тип А. */
export function computeTypeAScores(answers: AuditStepAnswers | undefined): TypeAScores {
  const empty: TypeAScores = {
    sum: null,
    answered: 0,
    profile: null,
    bandLabel: null,
    description: null,
  };
  if (!answers) {
    return empty;
  }
  let sum = 0;
  let answered = 0;
  for (let i = 1; i <= 20; i += 1) {
    const raw = answers[`q${String(i)}`];
    if (raw === "yes") {
      sum += TYPE_A_YES_SCORE;
      answered += 1;
    } else if (raw === "no") {
      sum += TYPE_A_NO_SCORE;
      answered += 1;
    } else if (raw === "unknown") {
      sum += TYPE_A_UNKNOWN_SCORE;
      answered += 1;
    }
  }
  if (answered < 20) {
    return {
      sum: answered > 0 ? sum : null,
      answered,
      profile: null,
      bandLabel: null,
      description: null,
    };
  }
  let profile: TypeAScores["profile"] = "type_b_tendency";
  if (sum <= 10) {
    profile = "type_b";
  } else if (sum >= 30) {
    profile = "type_a";
  } else if (sum >= 20) {
    profile = "type_a_tendency";
  }
  const band =
    TYPE_A_INTERPRETATION_BANDS.find((entry) => sum >= entry.min && sum <= entry.max) ?? null;
  return {
    sum,
    answered,
    profile,
    bandLabel: band?.label ?? null,
    description: band?.description ?? null,
  };
}

/** Полный текст интерпретации Теста 6 с пояснением типов А и Б. */
export function typeAInterpretation(scores: TypeAScores): string {
  const typeMeanings =
    `Тип Б (стрессоустойчивый): ${TYPE_B_PROFILE_DESCRIPTION}\n\n` +
    `Тип А: ${TYPE_A_PROFILE_DESCRIPTION}`;
  if (scores.bandLabel !== null && scores.description !== null) {
    return `${typeMeanings}\n\nЗаключение: ${scores.bandLabel}. ${scores.description}`;
  }
  return `${typeMeanings}\n\nНедостаточно данных для заключения (нужны ответы на все 20 вопросов).`;
}

import { STRELYAU_INTERPRETATION_BANDS } from "@/lib/audit/report/keys/auditScoringKeys";

export type StrelyauScores = {
  diff: number | null;
  groupAYes: number;
  groupBYes: number;
  answered: number;
  level: "high" | "above_avg" | "mid" | "below_avg" | "low" | null;
  bandLabel: string | null;
  description: string | null;
};

/** Тест 7 — сумма «да» группы А (1–10) минус сумма «да» группы Б (11–15). */
export function computeStrelyauScores(answers: AuditStepAnswers | undefined): StrelyauScores {
  let groupAYes = 0;
  let groupBYes = 0;
  let answered = 0;
  if (answers) {
    for (let i = 1; i <= 15; i += 1) {
      const raw = answers[`q${String(i)}`];
      if (raw !== "yes" && raw !== "no") {
        continue;
      }
      answered += 1;
      if (raw === "yes") {
        if (i <= 10) {
          groupAYes += 1;
        } else {
          groupBYes += 1;
        }
      }
    }
  }
  if (answered < 15) {
    return {
      diff: null,
      groupAYes,
      groupBYes,
      answered,
      level: null,
      bandLabel: null,
      description: null,
    };
  }
  const diff = groupAYes - groupBYes;
  let level: StrelyauScores["level"] = "mid";
  if (diff >= 8) {
    level = "high";
  } else if (diff >= 6) {
    level = "above_avg";
  } else if (diff === 5) {
    level = "mid";
  } else if (diff >= 3) {
    level = "below_avg";
  } else {
    level = "low";
  }
  const band =
    STRELYAU_INTERPRETATION_BANDS.find((entry) => diff >= entry.min && diff <= entry.max) ?? null;
  return {
    diff,
    groupAYes,
    groupBYes,
    answered,
    level,
    bandLabel: band?.label ?? null,
    description: band?.description ?? null,
  };
}

/** Полный текст интерпретации Теста 7. */
export function strelyauInterpretation(scores: StrelyauScores): string {
  const methodNote =
    "Показатель психологической гибкости: сумма ответов «да» в группе А (пункты 1–10, " +
    "гибкость и подвижность) минус сумма «да» в группе Б (пункты 11–15, инертность). " +
    "Чем выше показатель, тем выше социально-психологическая адаптивность.";
  if (scores.diff === null || scores.bandLabel === null || scores.description === null) {
    return `${methodNote} Недостаточно данных для заключения (нужны ответы на все 15 вопросов).`;
  }
  return (
    `${methodNote} Заключение: показатель ${String(scores.diff)} (${scores.bandLabel}). ` +
    `${scores.description}`
  );
}

export type RotterScores = {
  external: number | null;
  internal: number | null;
  answered: number;
  orientation: "external" | "internal" | "balanced" | null;
};

/** Тест 8 — 23 ключевых пары, 6 фоновых; макс. 23 балла по каждой шкале. */
export function computeRotterScores(answers: AuditStepAnswers | undefined): RotterScores {
  if (!answers) {
    return { external: null, internal: null, answered: 0, orientation: null };
  }
  let external = 0;
  let internal = 0;
  let answered = 0;
  for (let i = 1; i <= 29; i += 1) {
    if (ROTTER_BACKGROUND_PAIRS.has(i)) {
      continue;
    }
    const raw = answers[`q${String(i)}`];
    if (raw !== "a" && raw !== "b") {
      continue;
    }
    answered += 1;
    if (_rotterMatchesExternal(i, raw)) {
      external += 1;
    } else if (_rotterMatchesInternal(i, raw)) {
      internal += 1;
    }
  }
  if (answered < 23) {
    return {
      external: answered > 0 ? external : null,
      internal: answered > 0 ? internal : null,
      answered,
      orientation: null,
    };
  }
  let orientation: RotterScores["orientation"] = "balanced";
  if (external > internal) {
    orientation = "external";
  } else if (internal > external) {
    orientation = "internal";
  }
  return { external, internal, answered, orientation };
}

/** Полный текст интерпретации Теста 8. */
export function rotterInterpretation(scores: RotterScores): string {
  const profiles =
    `Экстернальность (внешний локус): ${ROTTER_EXTERNAL_DESCRIPTION} ` +
    `Интернальность (внутренний локус): ${ROTTER_INTERNAL_DESCRIPTION} ` +
    ROTTER_SUMMARY_NOTE;
  if (scores.external === null || scores.internal === null) {
    return (
      `${ROTTER_METHODOLOGY_INTRO} ${profiles} ` +
      "Недостаточно данных для заключения (нужны ответы на все 23 ключевые пары)."
    );
  }
  let conclusion = "";
  if (scores.orientation === "external") {
    conclusion =
      `Заключение: преобладает экстернальность (${String(scores.external)} из 23 ` +
      `против ${String(scores.internal)} по интернальности). О направленности локуса ` +
      "контроля судят по относительному превышению результатов одного измерения над другим.";
  } else if (scores.orientation === "internal") {
    conclusion =
      `Заключение: преобладает интернальность (${String(scores.internal)} из 23 ` +
      `против ${String(scores.external)} по экстернальности). О направленности локуса ` +
      "контроля судят по относительному превышению результатов одного измерения над другим.";
  } else {
    conclusion =
      `Заключение: показатели экстернальности и интернальности равны ` +
      `(${String(scores.external)} и ${String(scores.internal)} из 23).`;
  }
  return `${ROTTER_METHODOLOGY_INTRO} ${profiles} ${conclusion}`;
}

function _rotterMatchesExternal(pairIndex: number, answer: "a" | "b"): boolean {
  return (
    (ROTTER_EXTERNAL_ANSWER_A.has(pairIndex) && answer === "a") ||
    (ROTTER_EXTERNAL_ANSWER_B.has(pairIndex) && answer === "b")
  );
}

function _rotterMatchesInternal(pairIndex: number, answer: "a" | "b"): boolean {
  return (
    (ROTTER_EXTERNAL_ANSWER_B.has(pairIndex) && answer === "a") ||
    (ROTTER_EXTERNAL_ANSWER_A.has(pairIndex) && answer === "b")
  );
}

export type ToleranceFactorScores = {
  tn: number | null;
  itn1: number | null;
  mitn: number | null;
  answered: number;
  tnBand: "low" | "mid" | "high" | null;
  itn1Band: "low" | "mid" | "high" | null;
  mitnBand: "low" | "mid" | "high" | null;
};

/** Тест 9 (Корнилова) — три фактора с инверсией 14, 24, 25. */
export function computeToleranceScores(
  answers: AuditStepAnswers | undefined
): ToleranceFactorScores {
  const empty: ToleranceFactorScores = {
    tn: null,
    itn1: null,
    mitn: null,
    answered: 0,
    tnBand: null,
    itn1Band: null,
    mitnBand: null,
  };
  if (!answers) {
    return empty;
  }
  const scored = _scoreToleranceItems(answers);
  if (scored.answered < 33) {
    const tn = scored.answered > 0 ? _sumItems(scored.values, TOLERANCE_FACTOR_TN_ITEMS) : null;
    const itn1 =
      scored.answered > 0 ? _sumItems(scored.values, TOLERANCE_FACTOR_ITN1_ITEMS) : null;
    const mitn =
      scored.answered > 0 ? _sumItems(scored.values, TOLERANCE_FACTOR_MITN_ITEMS) : null;
    return {
      tn,
      itn1,
      mitn,
      answered: scored.answered,
      tnBand: tn !== null ? toleranceFactorBand("tn", tn) : null,
      itn1Band: itn1 !== null ? toleranceFactorBand("itn1", itn1) : null,
      mitnBand: mitn !== null ? toleranceFactorBand("mitn", mitn) : null,
    };
  }
  const tn = _sumItems(scored.values, TOLERANCE_FACTOR_TN_ITEMS);
  const itn1 = _sumItems(scored.values, TOLERANCE_FACTOR_ITN1_ITEMS);
  const mitn = _sumItems(scored.values, TOLERANCE_FACTOR_MITN_ITEMS);
  return {
    tn,
    itn1,
    mitn,
    answered: scored.answered,
    tnBand: toleranceFactorBand("tn", tn),
    itn1Band: toleranceFactorBand("itn1", itn1),
    mitnBand: toleranceFactorBand("mitn", mitn),
  };
}

/** Полный текст интерпретации Теста 9. */
export function toleranceInterpretation(scores: ToleranceFactorScores): string {
  const factorTexts =
    `${TOLERANCE_FACTOR_DESCRIPTIONS.tn} ${TOLERANCE_FACTOR_DESCRIPTIONS.itn1} ` +
    `${TOLERANCE_FACTOR_DESCRIPTIONS.mitn}`;
  if (
    scores.tn === null ||
    scores.itn1 === null ||
    scores.mitn === null ||
    scores.tnBand === null ||
    scores.itn1Band === null ||
    scores.mitnBand === null
  ) {
    return `${factorTexts} Недостаточно данных для заключения (нужны ответы на все 33 утверждения).`;
  }
  return (
    `${factorTexts} Заключение: ТН — ${String(scores.tn)} баллов ` +
    `(${toleranceFactorBandLabel("tn", scores.tn)}); ИТН-1 — ${String(scores.itn1)} баллов ` +
    `(${toleranceFactorBandLabel("itn1", scores.itn1)}); МИТН — ${String(scores.mitn)} баллов ` +
    `(${toleranceFactorBandLabel("mitn", scores.mitn)}).`
  );
}

export type CfitScoredTotals = {
  answeredTotal: number;
  questionsTotal: number;
  correctTotal: number;
  scorableTotal: number;
  byStep: ReadonlyArray<{
    stepIndex: number;
    answered: number;
    total: number;
    correct: number;
    scorable: number;
  }>;
};

/** CFIT — верные ответы по ключу приложения II (см. комментарий в auditScoringKeys). */
export function computeCfitScoredTotals(
  answers: Record<number, AuditStepAnswers | undefined> | undefined
): CfitScoredTotals {
  const steps = [10, 11, 12, 13, 14, 15, 16, 17] as const;
  let answeredTotal = 0;
  let questionsTotal = 0;
  let correctTotal = 0;
  let scorableTotal = 0;
  const byStep: CfitScoredTotals["byStep"][number][] = [];
  for (let si = 0; si < steps.length; si += 1) {
    const stepIndex = steps[si];
    const key = CFIT_ANSWER_KEYS[si] ?? [];
    const step = answers?.[stepIndex];
    let answered = 0;
    let total = 0;
    let correct = 0;
    const scorable = key.length;
    if (step) {
      const keys = Object.keys(step).filter((k) => /^q\d+$/.test(k));
      total = keys.length;
      for (let qi = 0; qi < key.length; qi += 1) {
        const normalized = normalizeAuditCfitChoice(step[`q${String(qi + 1)}`]);
        if (normalized === null) {
          continue;
        }
        answered += 1;
        if (normalized === key[qi]) {
          correct += 1;
        }
      }
    }
    answeredTotal += answered;
    questionsTotal += total;
    correctTotal += correct;
    scorableTotal += scorable;
    byStep.push({ stepIndex, answered, total, correct, scorable });
  }
  return { answeredTotal, questionsTotal, correctTotal, scorableTotal, byStep };
}

export type ThomasKilmannScores = {
  counts: Record<ThomasKilmannStyle, number>;
  answered: number;
  totalPairs: number;
  dominant: ThomasKilmannStyle | null;
  formulaA: number | null;
  formulaB: number | null;
  conflictAdvantage: "self" | "opponent" | "equal" | null;
};

const THOMAS_KILMANN_TOTAL_PAIRS = 30;
const THOMAS_KILMANN_STYLES: ReadonlyArray<ThomasKilmannStyle> = [
  "competing",
  "collaborating",
  "compromising",
  "avoiding",
  "accommodating",
];

/** Тест 13 (Thomas-Kilmann), шаг 18 аудита. */
export function computeThomasKilmannScores(
  answers: AuditStepAnswers | undefined
): ThomasKilmannScores {
  const counts: Record<ThomasKilmannStyle, number> = {
    competing: 0,
    collaborating: 0,
    compromising: 0,
    avoiding: 0,
    accommodating: 0,
  };
  let answered = 0;
  if (answers) {
    for (let i = 0; i < THOMAS_KILMANN_PAIR_KEY.length; i += 1) {
      const raw = answers[`q${String(i + 1)}`];
      if (raw !== "a" && raw !== "b") {
        continue;
      }
      answered += 1;
      const style = THOMAS_KILMANN_PAIR_KEY[i]?.[raw];
      if (style) {
        counts[style] += 1;
      }
    }
  }
  const dominant = _dominantThomasKilmannStyle(counts);
  const formula =
    answered === THOMAS_KILMANN_TOTAL_PAIRS
      ? _thomasKilmannConflictFormulas(counts)
      : { formulaA: null, formulaB: null, conflictAdvantage: null };
  return {
    counts,
    answered,
    totalPairs: THOMAS_KILMANN_TOTAL_PAIRS,
    dominant,
    ...formula,
  };
}

/** Уровень выраженности тактики (оптимум 5-7 из 30 пар). */
export function thomasKilmannStyleLevel(count: number): "low" | "optimal" | "high" {
  if (count < 5) {
    return "low";
  }
  if (count <= 7) {
    return "optimal";
  }
  return "high";
}

/** Подпись уровня выраженности тактики. */
export function thomasKilmannStyleLevelLabel(level: "low" | "optimal" | "high"): string {
  if (level === "low") {
    return "слабо выражена (ниже 5)";
  }
  if (level === "high") {
    return "сильно выражена (выше 7)";
  }
  return "оптимальный интервал (5-7)";
}

/** Полный текст интерпретации Теста 13. */
export function thomasKilmannInterpretation(scores: ThomasKilmannScores): string {
  const methodText =
    `${THOMAS_KILMANN_MODEL_DESCRIPTION} ${THOMAS_KILMANN_CONFLICT_FORMULA_DESCRIPTION} ` +
    `${THOMAS_KILMANN_STYLE_DESCRIPTIONS.competing} ${THOMAS_KILMANN_STYLE_DESCRIPTIONS.accommodating} ` +
    `${THOMAS_KILMANN_STYLE_DESCRIPTIONS.compromising} ${THOMAS_KILMANN_STYLE_DESCRIPTIONS.avoiding} ` +
    `${THOMAS_KILMANN_STYLE_DESCRIPTIONS.collaborating}`;

  if (scores.answered === 0) {
    return `${methodText} Данных опросника пока нет.`;
  }

  if (scores.answered < scores.totalPairs) {
    return (
      `${methodText} Ответов ${String(scores.answered)} из ${String(scores.totalPairs)}. ` +
      "Предварительный подсчёт; для формулы исхода конфликта нужны все 30 пар."
    );
  }

  const styleSummary = THOMAS_KILMANN_STYLES.map((style) => {
    const count = scores.counts[style];
    return (
      `${THOMAS_KILMANN_STYLE_LABELS[style]}: ${String(count)} ` +
      `(${thomasKilmannStyleLevelLabel(thomasKilmannStyleLevel(count))})`
    );
  }).join("; ");

  const dominantText =
    scores.dominant !== null
      ? `Ведущий стиль: ${thomasKilmannStyleLabel(scores.dominant)} ` +
        `(${THOMAS_KILMANN_STYLE_ALIASES[scores.dominant]}).`
      : "";

  const formulaText =
    scores.formulaA !== null && scores.formulaB !== null && scores.conflictAdvantage !== null
      ? `Формула исхода: А = ${String(scores.formulaA)}, Б = ${String(scores.formulaB)}. ` +
        _thomasKilmannConflictAdvantageText(scores.conflictAdvantage)
      : "";

  return `${methodText} Заключение: ${styleSummary}. ${dominantText} ${formulaText}`.trim();
}

export type GerchikovProfile = {
  counts: Record<GerchikovMotivationType, number>;
  answerSlots: number;
  indices: Partial<Record<GerchikovMotivationType, number>>;
  ranks: Partial<Record<GerchikovMotivationType, number>>;
};

/** Тест 14 (Gerchikov), шаг 19 аудита — индексы по таблице 1 docx. */
export function computeGerchikovProfile(
  answers: AuditStepAnswers | undefined
): GerchikovProfile {
  const counts: Record<GerchikovMotivationType, number> = {
    IN: 0,
    PR: 0,
    PA: 0,
    HO: 0,
    ST: 0,
  };
  let answerSlots = 0;
  if (!answers) {
    return { counts, answerSlots, indices: {}, ranks: {} };
  }
  const keyByQuestion = new Map(GERCHIKOV_KEY_TABLE.map((row) => [row.q, row]));
  const q1 = typeof answers.q1 === "string" ? answers.q1 : null;
  for (const question of AUDIT_STEP_21_QUESTIONS) {
    _applyGerchikovQuestionScores(
      question,
      answers[question.id],
      q1,
      keyByQuestion,
      counts,
      (n) => {
        answerSlots += n;
      }
    );
  }
  const indices: Partial<Record<GerchikovMotivationType, number>> = {};
  if (answerSlots > 0) {
    for (const t of Object.keys(counts) as GerchikovMotivationType[]) {
      indices[t] = counts[t] / answerSlots;
    }
  }
  const ranks = _rankGerchikovTypes(indices);
  return { counts, answerSlots, indices, ranks };
}

/**
 * Доминирующие типы мотивации: ведущие (ранг 1) и следующие за ними (ранг 2).
 * При равных индексах в одном ранге могут попасть все равнозначные типы (в т.ч. три).
 */
export function gerchikovDominantTypes(profile: GerchikovProfile): GerchikovMotivationType[] {
  const ordered: GerchikovMotivationType[] = ["ST", "IN", "PR", "PA", "HO"];
  const ranks = ordered
    .map((type) => profile.ranks[type])
    .filter((rank): rank is number => rank !== undefined);
  if (ranks.length === 0) {
    return [];
  }
  const minRank = Math.min(...ranks);
  const leading = ordered.filter((type) => profile.ranks[type] === minRank);
  const secondary = ordered.filter((type) => profile.ranks[type] === minRank + 1);
  return [...leading, ...secondary];
}

export type PochebutScores = {
  sum: number | null;
  answered: number;
  level: PochebutLoyaltyLevel | null;
};

/** Тест 15 (Почебут), шаг 20 аудита. */
export function computePochebutScores(answers: AuditStepAnswers | undefined): PochebutScores {
  if (!answers) {
    return { sum: null, answered: 0, level: null };
  }
  let sum = 0;
  let answered = 0;
  for (let i = 1; i <= 36; i += 1) {
    if (!POCHEBUT_SCORED_ITEMS.has(i)) {
      continue;
    }
    const raw = answers[`q${String(i)}`];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      continue;
    }
    const grade = Math.round(raw);
    const pts = POCHEBUT_GRADE_TO_SCORE[grade];
    if (pts === undefined) {
      continue;
    }
    sum += pts;
    answered += 1;
  }
  if (answered < POCHEBUT_SCORED_ITEMS.size) {
    return { sum: answered > 0 ? sum : null, answered, level: null };
  }
  const level = _pochebutLevelForSum(sum);
  return { sum, answered, level };
}

/** Полный текст интерпретации Теста 15. */
export function pochebutInterpretation(scores: PochebutScores): string {
  const methodText = `${POCHEBUT_OFFICIAL_TITLE}. ${POCHEBUT_METHODOLOGY_INTRO}`;
  const bandsText = POCHEBUT_INTERPRETATION_BANDS.map(
    (band) => `${band.label} (${String(band.min)}..${String(band.max)} баллов)`
  ).join("; ");

  if (scores.answered === 0) {
    return `${methodText} Данных опросника пока нет.`;
  }

  if (scores.answered < POCHEBUT_SCORED_ITEMS.size) {
    return (
      `${methodText} Ответов ${String(scores.answered)} из ${String(POCHEBUT_SCORED_ITEMS.size)} ` +
      "ключевых суждений. Для итогового уровня лояльности нужны все 18 пунктов."
    );
  }

  const band = scores.level !== null ? _pochebutBandForLevel(scores.level) : undefined;
  const levelText =
    band !== undefined
      ? `Заключение: ${band.label} (сумма ${String(scores.sum)} баллов). ${band.description}`
      : "";

  return `${methodText} Диапазоны: ${bandsText}. ${levelText}`.trim();
}

export type KosScores = {
  commMatches: number;
  orgMatches: number;
  commK: number | null;
  orgK: number | null;
  commLevel: number | null;
  orgLevel: number | null;
  answered: number;
};

/** Тест 16 (КОС), шаг 21 аудита. */
export function computeKosScores(answers: AuditStepAnswers | undefined): KosScores {
  let commMatches = 0;
  let orgMatches = 0;
  let answered = 0;
  if (answers) {
    for (const q of AUDIT_STEP_23_QUESTIONS) {
      const raw = answers[`q${String(q.index)}`];
      if (raw !== "yes" && raw !== "no") {
        continue;
      }
      answered += 1;
      if (KOS_COMM_YES_ITEMS.has(q.index) && raw === "yes") {
        commMatches += 1;
      }
      if (KOS_COMM_NO_ITEMS.has(q.index) && raw === "no") {
        commMatches += 1;
      }
      if (KOS_ORG_YES_ITEMS.has(q.index) && raw === "yes") {
        orgMatches += 1;
      }
      if (KOS_ORG_NO_ITEMS.has(q.index) && raw === "no") {
        orgMatches += 1;
      }
    }
  }
  const commK = answered >= 40 ? commMatches / 20 : null;
  const orgK = answered >= 40 ? orgMatches / 20 : null;
  return {
    commMatches,
    orgMatches,
    commK,
    orgK,
    commLevel: commK !== null ? _kosCommQualitativeLevel(commK) : null,
    orgLevel: orgK !== null ? _kosOrgQualitativeLevel(orgK) : null,
    answered,
  };
}

/** Полный текст интерпретации Теста 16. */
export function kosInterpretation(scores: KosScores): string {
  const methodText = `${KOS_OFFICIAL_TITLE}. ${KOS_METHODOLOGY_INTRO}`;

  if (scores.answered === 0) {
    return `${methodText} Данных опросника пока нет.`;
  }

  if (scores.answered < 40) {
    return (
      `${methodText} Ответов ${String(scores.answered)} из 40. ` +
      "Для расчёта K и качественной оценки нужны ответы на все вопросы."
    );
  }

  const commGrade = scores.commLevel as 1 | 2 | 3 | 4 | 5 | null;
  const orgGrade = scores.orgLevel as 1 | 2 | 3 | 4 | 5 | null;
  const commBand = commGrade !== null ? _kosBandForGrade(KOS_COMM_SCALE_BANDS, commGrade) : undefined;
  const orgBand = orgGrade !== null ? _kosBandForGrade(KOS_ORG_SCALE_BANDS, orgGrade) : undefined;

  const commSummary =
    commGrade !== null && scores.commK !== null && commBand !== undefined
      ? `Коммуникативные склонности: K = ${scores.commK.toFixed(2)} (${String(commBand.min)}-${String(commBand.max)}), ` +
        `оценка ${String(commGrade)} (${commBand.label}). ${KOS_GRADE_INTERPRETATIONS[commGrade]}`
      : "";

  const orgSummary =
    orgGrade !== null && scores.orgK !== null && orgBand !== undefined
      ? `Организаторские склонности: K = ${scores.orgK.toFixed(2)} (${String(orgBand.min)}-${String(orgBand.max)}), ` +
        `оценка ${String(orgGrade)} (${orgBand.label}). ${KOS_GRADE_INTERPRETATIONS[orgGrade]}`
      : "";

  const userSummary = [commSummary, orgSummary].filter(Boolean).join(" ");
  return `${methodText} ${KOS_METHODOLOGY_NOTE} Заключение: ${userSummary}`.trim();
}

export type KeirseyScores = {
  pairsAnswered: number;
  pairsTotal: number;
  e: number;
  i: number;
  s: number;
  n: number;
  t: number;
  f: number;
  j: number;
  p: number;
  typeCode: string | null;
  temperament: KeirseyTemperament | null;
  brightnessSum: number | null;
  brightnessLevel: "bright" | "dim" | null;
};

/**
 * Тест 11 (Кейрси): подсчёт E/I, S/N, T/F, J/P по бланку 70 пар; при равенстве — правый полюс.
 */
export function computeKeirseyScores(
  answers: AuditStepAnswers | undefined
): KeirseyScores {
  const empty: KeirseyScores = {
    pairsAnswered: 0,
    pairsTotal: AUDIT_STEP_18_PAIRS.length,
    e: 0,
    i: 0,
    s: 0,
    n: 0,
    t: 0,
    f: 0,
    j: 0,
    p: 0,
    typeCode: null,
    temperament: null,
    brightnessSum: null,
    brightnessLevel: null,
  };
  if (!answers) {
    return empty;
  }
  let pairsAnswered = 0;
  const counts = { e: 0, i: 0, s: 0, n: 0, t: 0, f: 0, j: 0, p: 0 };
  for (const pair of AUDIT_STEP_18_PAIRS) {
    const raw = answers[`q${String(pair.index)}`];
    if (raw !== "a" && raw !== "b") {
      continue;
    }
    pairsAnswered += 1;
    _addKeirseyPoleCount(pair.index, raw, counts);
  }
  if (pairsAnswered === 0) {
    return { ...empty, pairsAnswered };
  }
  const typeCode = _keirseyTypeCode(counts);
  const brightnessSum = _keirseyBrightnessSum(counts);
  return {
    pairsAnswered,
    pairsTotal: AUDIT_STEP_18_PAIRS.length,
    ...counts,
    typeCode,
    temperament: typeCode !== null ? _keirseyTemperament(typeCode) : null,
    brightnessSum,
    brightnessLevel:
      brightnessSum !== null ? _keirseyBrightnessLevel(brightnessSum) : null,
  };
}

export function keirseyTemperamentLabel(temperament: KeirseyTemperament | null): string {
  if (temperament === null) {
    return "недостаточно данных";
  }
  return KEIRSEY_TEMPERAMENT_LABELS[temperament];
}

export function keirseyTypeLabel(typeCode: string | null): string {
  if (typeCode === null) {
    return "недостаточно данных";
  }
  const portrait = KEIRSEY_TYPE_LABELS[typeCode];
  return portrait !== undefined ? `${typeCode} («${portrait}»)` : typeCode;
}

/** Подпись доминирующего полюса шкалы Кейрси. */
export function keirseyDominantPoleLabel(letter: string): string {
  const labels: Readonly<Record<string, string>> = {
    E: "экстраверсия",
    I: "интроверсия",
    S: "здравомыслие",
    N: "интуиция",
    T: "логичность",
    F: "чувствование",
    J: "рассудительность",
    P: "импульсивность",
  };
  const name = labels[letter] ?? letter;
  return `${letter} (${name})`;
}

/** Полный текст интерпретации Теста 11 (Кейрси). */
export function keirseyInterpretation(scores: KeirseyScores): string {
  const scalesText =
    `${KEIRSEY_DIMENSION_DESCRIPTIONS.ei} ${KEIRSEY_DIMENSION_DESCRIPTIONS.sn} ` +
    `${KEIRSEY_DIMENSION_DESCRIPTIONS.tf} ${KEIRSEY_DIMENSION_DESCRIPTIONS.jp} ` +
    KEIRSEY_BRIGHTNESS_DESCRIPTION;

  if (scores.pairsAnswered === 0) {
    return `${scalesText} Данных опросника пока нет.`;
  }

  if (scores.pairsAnswered < scores.pairsTotal) {
    return (
      `${scalesText} Ответов ${String(scores.pairsAnswered)} из ${String(scores.pairsTotal)}. ` +
      "Предварительный подсчёт; для надёжной интерпретации нужны все 70 пар."
    );
  }

  if (scores.typeCode === null || scores.temperament === null) {
    return `${scalesText} Недостаточно данных для определения типа.`;
  }

  const typePortrait = KEIRSEY_TYPE_PORTRAIT_TEXT[scores.typeCode];
  const portraitText =
    typePortrait !== undefined
      ? ` Портрет «${KEIRSEY_TYPE_LABELS[scores.typeCode] ?? scores.typeCode}»: ${typePortrait}.`
      : "";

  const brightnessText =
    scores.brightnessSum !== null && scores.brightnessLevel !== null
      ? ` Σ(b) = ${String(scores.brightnessSum)}: ${
          scores.brightnessLevel === "bright"
            ? "яркий тип (20-40), более выражен и устойчив"
            : "неяркий тип (0-20), менее выражен и устойчив"
        }.`
      : "";

  return (
    `${scalesText} Заключение: психологический тип ${keirseyTypeLabel(scores.typeCode)}; ` +
    `темперамент ${keirseyTemperamentLabel(scores.temperament)} - ` +
    `${KEIRSEY_TEMPERAMENT_VALUES[scores.temperament]}. ` +
    `${KEIRSEY_TEMPERAMENT_DESCRIPTIONS[scores.temperament]}` +
    `${portraitText}${brightnessText}`
  );
}

export type EruditionScores = {
  answered: number;
  total: number;
  correct: number;
  /** Фактические или экстраполированные баллы для шкалы 0-55. */
  scaledScore: number | null;
  /** Доля верных ответов среди данных (0..1). */
  percentCorrect: number | null;
  isComplete: boolean;
  grade: string | null;
  description: string | null;
};

/**
 * Тест 17 (эрудиция): 1 балл за верный ответ; при неполном прохождении — экстраполяция по %.
 */
export function computeEruditionScores(
  answers: AuditStepAnswers | undefined
): EruditionScores {
  const total = AUDIT_STEP_24_QUESTIONS.length;
  let answered = 0;
  let correct = 0;
  if (answers) {
    for (const q of AUDIT_STEP_24_QUESTIONS) {
      const raw = answers[`q${String(q.index)}`];
      if (typeof raw !== "string" || raw.length === 0) {
        continue;
      }
      answered += 1;
      if (raw === q.correctOptionId) {
        correct += 1;
      }
    }
  }
  if (answered === 0) {
    return {
      answered,
      total,
      correct,
      scaledScore: null,
      percentCorrect: null,
      isComplete: false,
      grade: null,
      description: null,
    };
  }
  const percentCorrect = correct / answered;
  const isComplete = answered === total;
  const scaledScore = isComplete ? correct : Math.round(percentCorrect * total);
  const band = _eruditionBandForScore(scaledScore);
  return {
    answered,
    total,
    correct,
    scaledScore,
    percentCorrect,
    isComplete,
    grade: band?.grade ?? null,
    description: band?.description ?? null,
  };
}

/** Полный текст интерпретации Теста 17. */
export function eruditionInterpretation(scores: EruditionScores): string {
  const methodText = `${ERUDITION_OFFICIAL_TITLE}. ${ERUDITION_METHODOLOGY_INTRO}`;
  const bandsText = ERUDITION_INTERPRETATION_BANDS.map(
    (band) => `${band.grade} (${String(band.min)}-${String(band.max)} баллов): ${band.description}`
  ).join(" ");

  if (scores.answered === 0) {
    return `${methodText} Данных опросника пока нет.`;
  }

  const percentText =
    scores.percentCorrect !== null
      ? `${Math.round(scores.percentCorrect * 100)}% верных из ${String(scores.answered)} ответов`
      : "";

  const partialNote =
    !scores.isComplete && scores.scaledScore !== null
      ? `Ответов ${String(scores.answered)} из ${String(scores.total)}, верных ${String(scores.correct)} (${percentText}). ` +
        `Экстраполированный балл: ${String(scores.scaledScore)} из ${String(scores.total)}. `
      : "";

  const conclusion =
    scores.grade !== null &&
    scores.description !== null &&
    scores.scaledScore !== null
      ? scores.isComplete
        ? `Заключение: ${scores.grade} (${String(scores.scaledScore)} из ${String(scores.total)} баллов). ${scores.description}`
        : `${partialNote}Заключение (по экстраполяции): ${scores.grade} (${String(scores.scaledScore)} из ${String(scores.total)} баллов). ${scores.description}`
      : "";

  return `${methodText} Диапазоны: ${bandsText}. ${conclusion}`.trim();
}

export function roweDominantStyleLabel(style: RoweStyleId | null): string {
  if (style === null) {
    return "недостаточно данных";
  }
  return `стиль ${String(style)} — ${ROWE_STYLE_LABELS[style]}`;
}

/** Полный текст интерпретации одного стиля Теста 1. */
export function roweStyleInterpretationText(style: RoweStyleId): string {
  return `Стиль ${String(style)} — ${ROWE_STYLE_LABELS[style]}. ${ROWE_STYLE_INTERPRETATIONS[style]}`;
}

/** Текст заключения по доминирующим стилям (с учётом ничьей). */
export function roweDominantInterpretation(
  dominantStyles: ReadonlyArray<RoweStyleId>
): string {
  if (dominantStyles.length === 0) {
    return "Недостаточно данных для определения предпочтительного стиля.";
  }
  const lead =
    dominantStyles.length === 1
      ? `Наиболее предпочтительный стиль — стиль ${String(dominantStyles[0]!)}.`
      : `Наиболее предпочтительны стили ${dominantStyles.map((s) => String(s)).join(" и ")} (равное число баллов).`;
  const bodies = dominantStyles.map((s) => roweStyleInterpretationText(s)).join(" ");
  return `${lead} ${bodies}`;
}

export function thomasKilmannStyleLabel(style: ThomasKilmannStyle | null): string {
  if (style === null) {
    return "недостаточно данных";
  }
  return THOMAS_KILMANN_STYLE_LABELS[style];
}

/** Две (или меньше) ведущие стили Томаса-Килманна по сырому числу выборов. */
export function thomasKilmannLeadingStyles(
  counts: Record<ThomasKilmannStyle, number>,
  limit = 2
): ReadonlyArray<{ style: ThomasKilmannStyle; count: number }> {
  return THOMAS_KILMANN_STYLES.map((style) => ({ style, count: counts[style] }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return (
        THOMAS_KILMANN_STYLES.indexOf(left.style) - THOMAS_KILMANN_STYLES.indexOf(right.style)
      );
    })
    .slice(0, limit);
}

export function gerchikovTypeLabel(type: GerchikovMotivationType): string {
  return GERCHIKOV_CONCLUSION_TYPE_LABELS[type];
}

/** Код типа мотивации для таблиц (ИН, ПР, ПА, ХО, ЛЮ). */
export function gerchikovTypeShortLabel(type: GerchikovMotivationType): string {
  return GERCHIKOV_TYPE_SHORT_LABELS[type];
}

const GERCHIKOV_EXPORT_TYPE_ORDER: ReadonlyArray<GerchikovMotivationType> = [
  "ST",
  "IN",
  "PR",
  "PA",
  "HO",
];

/**
 * Два типа мотивации с наибольшими баллами (для Google Sheets: «ИН/ПА»).
 */
export function gerchikovTopTwoTypesForExport(
  profile: GerchikovProfile
): ReadonlyArray<GerchikovMotivationType> {
  if (profile.answerSlots === 0) {
    return [];
  }
  return [...GERCHIKOV_EXPORT_TYPE_ORDER]
    .sort((left, right) => {
      const scoreDiff = profile.counts[right] - profile.counts[left];
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return (
        GERCHIKOV_EXPORT_TYPE_ORDER.indexOf(left) - GERCHIKOV_EXPORT_TYPE_ORDER.indexOf(right)
      );
    })
    .slice(0, 2);
}

/** Подпись типа мотивации для выгрузки в Google Sheets (два ведущих типа через «/»). */
export function gerchikovGoogleSheetsExportLabel(profile: GerchikovProfile): string | null {
  const topTwo = gerchikovTopTwoTypesForExport(profile);
  if (topTwo.length === 0) {
    return null;
  }
  return topTwo.map((type) => gerchikovTypeShortLabel(type)).join("/");
}

/** Полный текст интерпретации Теста 14 (Герчиков). */
export function gerchikovInterpretation(profile: GerchikovProfile): string {
  const methodText = `${GERCHIKOV_METHODOLOGY_INTRO} ${GERCHIKOV_STIMULATION_LEVEL_NOTE}`;

  if (profile.answerSlots === 0) {
    return `${methodText} Данных анкеты пока нет.`;
  }

  const orderedTypes: GerchikovMotivationType[] = ["ST", "IN", "PR", "PA", "HO"];

  const minRank = Math.min(
    ...orderedTypes
      .map((type) => profile.ranks[type])
      .filter((rank): rank is number => rank !== undefined)
  );
  const leadingTypes = orderedTypes.filter((type) => profile.ranks[type] === minRank);
  const secondRank = minRank + 1;
  const secondaryTypes = orderedTypes.filter((type) => profile.ranks[type] === secondRank);
  const dominantTypes = [...leadingTypes, ...secondaryTypes];

  const leadingText =
    leadingTypes.length > 0
      ? leadingTypes.map((type) => GERCHIKOV_CONCLUSION_TYPE_LABELS[type]).join(" / ")
      : "не определены";
  const secondaryText =
    secondaryTypes.length > 0
      ? secondaryTypes.map((type) => GERCHIKOV_CONCLUSION_TYPE_LABELS[type]).join(" / ")
      : "";

  const typeDescriptions = dominantTypes
    .map((type) => GERCHIKOV_CONCLUSION_DESCRIPTIONS[type])
    .join(" ");

  const stimulation = _gerchikovStimulationSummary(dominantTypes);

  const dominantLead =
    secondaryText.length > 0
      ? `Ведущие типы: ${leadingText} (ранг 1) и ${secondaryText} (ранг 2).`
      : `Ведущий тип: ${leadingText} (ранг 1).`;

  return (
    `${methodText} Заключение: ${dominantLead} ${typeDescriptions} ${stimulation}`
  ).trim();
}

function _gerchikovStimulationSummary(dominantTypes: GerchikovMotivationType[]): string {
  if (dominantTypes.length === 0) {
    return "";
  }

  const forms = Object.keys(GERCHIKOV_STIMULATION_TABLE) as GerchikovStimulationForm[];
  const baseForms: string[] = [];
  const applicableForms: string[] = [];
  const forbiddenForms: string[] = [];

  for (const form of forms) {
    const levels = dominantTypes.map((type) => GERCHIKOV_STIMULATION_TABLE[form][type]);
    const combined = _combineGerchikovStimulationLevels(levels);
    const label = GERCHIKOV_STIMULATION_FORM_LABELS[form];
    if (combined === "base") {
      baseForms.push(label);
    } else if (combined === "applicable") {
      applicableForms.push(label);
    } else if (combined === "forbidden") {
      forbiddenForms.push(label);
    }
  }

  const parts: string[] = [];
  if (baseForms.length > 0) {
    parts.push(`Стимулирование базируется на: ${baseForms.join("; ")}.`);
  }
  if (applicableForms.length > 0) {
    parts.push(`Применимы: ${applicableForms.join("; ")}.`);
  }
  if (forbiddenForms.length > 0) {
    parts.push(`Запрещены: ${forbiddenForms.join("; ")}.`);
  }
  return parts.join(" ");
}

function _combineGerchikovStimulationLevels(
  levels: ReadonlyArray<GerchikovStimulationLevel>
): GerchikovStimulationLevel {
  if (levels.some((level) => level === "forbidden")) {
    return "forbidden";
  }
  if (levels.some((level) => level === "base")) {
    return "base";
  }
  if (levels.some((level) => level === "applicable")) {
    return "applicable";
  }
  return "neutral";
}

function _buildRoweItemStyleMap(): Map<number, RoweStyleId> {
  const map = new Map<number, RoweStyleId>();
  for (const style of [1, 2, 3, 4] as const) {
    for (const item of ROWE_STYLE_ITEMS[style]) {
      map.set(item, style);
    }
  }
  return map;
}

function _snyderBandForScore(
  score: number
): (typeof SNYDER_INTERPRETATION_BANDS)[number] | null {
  for (const band of SNYDER_INTERPRETATION_BANDS) {
    if (score >= band.min && score <= band.max) {
      return band;
    }
  }
  return null;
}

function _goalPursuitBandForSum(
  sum: number
): (typeof GOAL_PURSUIT_INTERPRETATION_BANDS)[number] | null {
  for (const band of GOAL_PURSUIT_INTERPRETATION_BANDS) {
    if (sum >= band.min && sum <= band.max) {
      return band;
    }
  }
  return null;
}

function _paperworkProfiles(
  groupScores: Record<1 | 2 | 3 | 4, number>
): string[] {
  const profiles: string[] = [];
  if (groupScores[1] >= 7) {
    profiles.push("«суперисполнитель»");
  }
  if (groupScores[2] >= 7) {
    profiles.push("«расшифровщик»");
  }
  if (groupScores[3] >= 7) {
    profiles.push("«антибюрократ»");
  }
  if (groupScores[4] >= 7) {
    profiles.push("«волокитчик»");
  } else if (groupScores[4] <= 3) {
    profiles.push("избыточная дотошность к документам");
  }
  return profiles;
}

function _paperworkInterpretationParts(
  groupScores: Record<1 | 2 | 3 | 4, number>
): string[] {
  const parts: string[] = [];
  if (groupScores[1] >= 7) {
    parts.push(PAPERWORK_GROUP1_HIGH);
    if (groupScores[4] >= 5) {
      parts.push(PAPERWORK_GROUP1_WITH_GROUP4);
    }
  }
  if (groupScores[2] >= 7) {
    parts.push(PAPERWORK_GROUP2_HIGH);
  }
  if (groupScores[3] >= 7) {
    parts.push(PAPERWORK_GROUP3_HIGH);
  }
  if (groupScores[4] <= 3) {
    parts.push(PAPERWORK_GROUP4_LOW);
  } else if (groupScores[4] >= 7) {
    parts.push(PAPERWORK_GROUP4_HIGH);
  }
  if (_isPaperworkBalanced(groupScores)) {
    parts.push(PAPERWORK_BALANCED);
  }
  return parts;
}

function _isPaperworkBalanced(groupScores: Record<1 | 2 | 3 | 4, number>): boolean {
  return ([1, 2, 3, 4] as const).every((g) => groupScores[g] >= 3 && groupScores[g] <= 5);
}

function _roweDominantStyles(
  counts: Record<RoweStyleId, number>
): ReadonlyArray<RoweStyleId> {
  let bestN = -1;
  for (const s of [1, 2, 3, 4] as const) {
    if (counts[s] > bestN) {
      bestN = counts[s];
    }
  }
  if (bestN <= 0) {
    return [];
  }
  return ([1, 2, 3, 4] as const).filter((s) => counts[s] === bestN);
}

function _scoreToleranceItems(answers: AuditStepAnswers): {
  values: Record<number, number>;
  answered: number;
} {
  const values: Record<number, number> = {};
  let answered = 0;
  for (let i = 1; i <= 33; i += 1) {
    const raw = answers[`q${String(i)}`];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      continue;
    }
    let v = raw;
    if (TOLERANCE_INVERT_ITEMS.has(i)) {
      v = 8 - v;
    }
    values[i] = v;
    answered += 1;
  }
  return { values, answered };
}

function _sumItems(values: Record<number, number>, items: ReadonlyArray<number>): number {
  let sum = 0;
  for (const i of items) {
    sum += values[i] ?? 0;
  }
  return sum;
}

function _dominantThomasKilmannStyle(
  counts: Record<ThomasKilmannStyle, number>
): ThomasKilmannStyle | null {
  let best: ThomasKilmannStyle | null = null;
  let bestN = -1;
  for (const k of Object.keys(counts) as ThomasKilmannStyle[]) {
    if (counts[k] > bestN) {
      bestN = counts[k];
      best = k;
    }
  }
  return bestN > 0 ? best : null;
}

function _thomasKilmannConflictFormulas(counts: Record<ThomasKilmannStyle, number>): {
  formulaA: number;
  formulaB: number;
  conflictAdvantage: "self" | "opponent" | "equal";
} {
  const halfCompromise = counts.compromising / 2;
  const formulaA = counts.competing + counts.collaborating + halfCompromise;
  const formulaB = counts.accommodating + counts.avoiding + halfCompromise;
  let conflictAdvantage: "self" | "opponent" | "equal" = "equal";
  if (formulaA > formulaB) {
    conflictAdvantage = "self";
  } else if (formulaB > formulaA) {
    conflictAdvantage = "opponent";
  }
  return {
    formulaA: Math.round(formulaA * 10) / 10,
    formulaB: Math.round(formulaB * 10) / 10,
    conflictAdvantage,
  };
}

function _thomasKilmannConflictAdvantageText(
  advantage: "self" | "opponent" | "equal"
): string {
  if (advantage === "self") {
    return "А > Б: шанс выиграть конфликтную ситуацию есть у вас.";
  }
  if (advantage === "opponent") {
    return "Б > А: шанс выиграть конфликт есть у вашего оппонента.";
  }
  return "А = Б: исход конфликта не имеет явного преимущества ни у одной из сторон.";
}

function _applyGerchikovQuestionScores(
  question: AuditStep21Question,
  rawValue: unknown,
  q1: string | null,
  keyByQuestion: Map<string, (typeof GERCHIKOV_KEY_TABLE)[number]>,
  counts: Record<GerchikovMotivationType, number>,
  addSlots: (n: number) => void
): void {
  if (question.kind === "passport_single" || question.kind === "passport_number") {
    return;
  }
  if (question.kind === "passport_tenure") {
    return;
  }
  if (question.kind === "single" || question.kind === "multi_one_or_two" || question.kind === "multi_any") {
    const key = keyByQuestion.get(question.sourceLabel);
    if (!key) {
      return;
    }
    const selected = _gerchikovSelectedOptionNumbers(rawValue);
    for (const num of selected) {
      _addGerchikovOptionToCounts(key, num, counts);
      addSlots(1);
    }
    return;
  }
  if (question.kind === "matrix_importance") {
    if (!Array.isArray(rawValue)) {
      return;
    }
    rawValue.forEach((cell, rowIndex) => {
      const subKey = `10.${String(rowIndex + 1)}`;
      const key = keyByQuestion.get(subKey);
      if (!key || typeof cell !== "string") {
        return;
      }
      const colIndex = question.columns.findIndex((c) => c.id === cell);
      if (colIndex < 0) {
        return;
      }
      _addGerchikovOptionToCounts(key, colIndex + 1, counts);
      addSlots(1);
    });
    return;
  }
  if (question.kind === "branched_18") {
    const isManager = q1 === question.managerOptionId;
    const key = keyByQuestion.get(isManager ? "18.1" : "18.2");
    if (!key || !Array.isArray(rawValue)) {
      return;
    }
    for (const id of rawValue) {
      if (typeof id !== "string") {
        continue;
      }
      const num = _gerchikovOptionIdToNumber(id);
      if (num === null) {
        continue;
      }
      _addGerchikovOptionToCounts(key, num, counts);
      addSlots(1);
    }
  }
}

function _gerchikovSelectedOptionNumbers(rawValue: unknown): number[] {
  if (typeof rawValue === "string") {
    const n = _gerchikovOptionIdToNumber(rawValue);
    return n === null ? [] : [n];
  }
  if (!Array.isArray(rawValue)) {
    return [];
  }
  const out: number[] = [];
  for (const id of rawValue) {
    if (typeof id !== "string") {
      continue;
    }
    const n = _gerchikovOptionIdToNumber(id);
    if (n !== null) {
      out.push(n);
    }
  }
  return out;
}

function _gerchikovOptionIdToNumber(id: string): number | null {
  const m = /^[ab](\d+)$/.exec(id);
  if (!m) {
    return null;
  }
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function _addGerchikovOptionToCounts(
  key: (typeof GERCHIKOV_KEY_TABLE)[number],
  optionNumber: number,
  counts: Record<GerchikovMotivationType, number>
): void {
  for (const t of ["IN", "PR", "PA", "HO", "ST"] as const) {
    const opts = key[t];
    if (opts?.includes(optionNumber)) {
      counts[t] += 1;
    }
  }
}

function _rankGerchikovTypes(
  indices: Partial<Record<GerchikovMotivationType, number>>
): Partial<Record<GerchikovMotivationType, number>> {
  const entries = (Object.keys(indices) as GerchikovMotivationType[])
    .filter((t) => typeof indices[t] === "number")
    .sort((a, b) => (indices[b] ?? 0) - (indices[a] ?? 0));
  const ranks: Partial<Record<GerchikovMotivationType, number>> = {};
  let rank = 1;
  for (let i = 0; i < entries.length; i += 1) {
    const t = entries[i]!;
    if (i > 0 && indices[t] === indices[entries[i - 1]!]) {
      ranks[t] = ranks[entries[i - 1]!]!;
    } else {
      ranks[t] = rank;
    }
    rank += 1;
  }
  return ranks;
}

function _addKeirseyPoleCount(
  questionIndex: number,
  answer: "a" | "b",
  counts: { e: number; i: number; s: number; n: number; t: number; f: number; j: number; p: number }
): void {
  const isFirstPole = answer === "a";
  if (KEIRSEY_EI_A_ITEMS.has(questionIndex)) {
    if (isFirstPole) {
      counts.e += 1;
    } else {
      counts.i += 1;
    }
    return;
  }
  if (KEIRSEY_SN_A_ITEMS.has(questionIndex)) {
    if (isFirstPole) {
      counts.s += 1;
    } else {
      counts.n += 1;
    }
    return;
  }
  if (KEIRSEY_TF_A_ITEMS.has(questionIndex)) {
    if (isFirstPole) {
      counts.t += 1;
    } else {
      counts.f += 1;
    }
    return;
  }
  if (KEIRSEY_JP_A_ITEMS.has(questionIndex)) {
    if (isFirstPole) {
      counts.j += 1;
    } else {
      counts.p += 1;
    }
  }
}

function _keirseyDominantPole(first: number, second: number, secondLetter: string, firstLetter: string): string {
  if (first > second) {
    return firstLetter;
  }
  return secondLetter;
}

function _keirseyTypeCode(
  counts: { e: number; i: number; s: number; n: number; t: number; f: number; j: number; p: number }
): string {
  return (
    _keirseyDominantPole(counts.e, counts.i, "I", "E") +
    _keirseyDominantPole(counts.s, counts.n, "N", "S") +
    _keirseyDominantPole(counts.t, counts.f, "F", "T") +
    _keirseyDominantPole(counts.j, counts.p, "P", "J")
  );
}

function _keirseyTemperament(typeCode: string): KeirseyTemperament | null {
  const sn = typeCode[1];
  const tf = typeCode[2];
  const jp = typeCode[3];
  if (sn === "S" && jp === "P") {
    return "SP";
  }
  if (sn === "S" && jp === "J") {
    return "SJ";
  }
  if (sn === "N" && tf === "F") {
    return "NF";
  }
  if (sn === "N" && tf === "T") {
    return "NT";
  }
  return null;
}

function _keirseyBrightnessSum(
  counts: { e: number; i: number; s: number; n: number; t: number; f: number; j: number; p: number }
): number {
  const ei = (Math.max(counts.e, counts.i) - 5) * 2;
  const sn = Math.max(counts.s, counts.n) - 10;
  const tf = Math.max(counts.t, counts.f) - 10;
  const jp = Math.max(counts.j, counts.p) - 10;
  return ei + sn + tf + jp;
}

function _keirseyBrightnessLevel(sum: number): "bright" | "dim" {
  return sum > 20 ? "bright" : "dim";
}

function _eruditionBandForScore(
  correct: number
): (typeof ERUDITION_INTERPRETATION_BANDS)[number] | null {
  for (const band of ERUDITION_INTERPRETATION_BANDS) {
    if (correct >= band.min && correct <= band.max) {
      return band;
    }
  }
  return null;
}

function _kosCommQualitativeLevel(k: number): number {
  if (k <= 0.45) {
    return 1;
  }
  if (k <= 0.55) {
    return 2;
  }
  if (k <= 0.65) {
    return 3;
  }
  if (k <= 0.75) {
    return 4;
  }
  return 5;
}

function _kosOrgQualitativeLevel(k: number): number {
  if (k <= 0.55) {
    return 1;
  }
  if (k <= 0.65) {
    return 2;
  }
  if (k <= 0.7) {
    return 3;
  }
  if (k <= 0.8) {
    return 4;
  }
  return 5;
}

function _kosBandForGrade(
  bands: ReadonlyArray<(typeof KOS_COMM_SCALE_BANDS)[number]>,
  grade: 1 | 2 | 3 | 4 | 5
): (typeof KOS_COMM_SCALE_BANDS)[number] | undefined {
  return bands.find((band) => band.grade === grade);
}

function _toleranceBand(
  value: number,
  lowMax: number,
  midMax: number
): "low" | "mid" | "high" {
  if (value <= lowMax) {
    return "low";
  }
  if (value <= midMax) {
    return "mid";
  }
  return "high";
}

export function toleranceFactorBand(
  factor: "tn" | "itn1" | "mitn",
  sum: number
): "low" | "mid" | "high" {
  const bands = TOLERANCE_FACTOR_BANDS[factor];
  for (const band of bands) {
    if (sum >= band.min && sum <= band.max) {
      if (band.label.startsWith("низ")) {
        return "low";
      }
      if (band.label.startsWith("выс")) {
        return "high";
      }
      return "mid";
    }
  }
  if (factor === "tn") {
    return _toleranceBand(sum, 35, 60);
  }
  if (factor === "itn1") {
    return _toleranceBand(sum, 38, 65);
  }
  return _toleranceBand(sum, 23, 40);
}

/** Подпись диапазона фактора для отчёта (напр. «36-60 - средний показатель»). */
export function toleranceFactorBandLabel(factor: "tn" | "itn1" | "mitn", sum: number): string {
  const bands = TOLERANCE_FACTOR_BANDS[factor];
  for (const band of bands) {
    if (sum >= band.min && sum <= band.max) {
      return `${String(band.min)}-${String(band.max)} - ${band.label}`;
    }
  }
  const level = toleranceFactorBand(factor, sum);
  if (level === "low") {
    return bands[0]?.label ?? "низкий показатель";
  }
  if (level === "high") {
    return bands[2]?.label ?? "высокий показатель";
  }
  return bands[1]?.label ?? "средний показатель";
}

export function pochebutLevelLabel(level: PochebutScores["level"]): string {
  if (level === null) {
    return "недостаточно данных";
  }
  return _pochebutBandForLevel(level)?.label ?? "недостаточно данных";
}

function _pochebutLevelForSum(sum: number): PochebutLoyaltyLevel {
  if (sum >= 54) {
    return "high";
  }
  if (sum <= -18) {
    return "very_low";
  }
  if (sum >= 18) {
    return "mid";
  }
  return "low";
}

function _pochebutBandForLevel(
  level: PochebutLoyaltyLevel
): (typeof POCHEBUT_INTERPRETATION_BANDS)[number] | undefined {
  return POCHEBUT_INTERPRETATION_BANDS.find((band) => band.level === level);
}

export function kosLevelLabel(level: number | null): string {
  switch (level) {
    case 1:
      return "низкий";
    case 2:
      return "ниже среднего";
    case 3:
      return "средний";
    case 4:
      return "высокий";
    case 5:
      return "очень высокий";
    default:
      return "недостаточно данных";
  }
}
