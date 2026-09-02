/**
 * Шаг 1: официальный КОТ (Бузин / Вандерлик), 50 заданий по методичке.
 * Ответы хранятся строками (выбор «1»…«5», число, «да», «н», «3,5» и т.д.).
 */

export const KOT_STEP_QUESTION_COUNT = 50;

const KEYS_50 = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q11",
  "q12",
  "q13",
  "q14",
  "q15",
  "q16",
  "q17",
  "q18",
  "q19",
  "q20",
  "q21",
  "q22",
  "q23",
  "q24",
  "q25",
  "q26",
  "q27",
  "q28",
  "q29",
  "q30",
  "q31",
  "q32",
  "q33",
  "q34",
  "q35",
  "q36",
  "q37",
  "q38",
  "q39",
  "q40",
  "q41",
  "q42",
  "q43",
  "q44",
  "q45",
  "q46",
  "q47",
  "q48",
  "q49",
  "q50",
] as const;

export type KotQuestionKey = (typeof KEYS_50)[number];

export type KotStep1Data = Record<KotQuestionKey, string | null>;

export function createEmptyKotStep1Data(): KotStep1Data {
  const o = {} as Record<string, string | null>;
  for (const k of KEYS_50) {
    o[k] = null;
  }
  return o as KotStep1Data;
}

export function allKotQuestionKeys(): readonly KotQuestionKey[] {
  return KEYS_50;
}
