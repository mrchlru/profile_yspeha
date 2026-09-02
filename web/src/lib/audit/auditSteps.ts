/**
 * Конфигурация 24 шагов аудита состояния.
 *
 * Каждый шаг знает:
 *   - какой UI отображать (`answerKind`);
 *   - сколько вопросов в нём ожидается (`itemCount`);
 *   - есть ли таймер и какой (`timerSeconds`);
 *   - какой текст инструкции показать (`introKey`);
 *   - какая методика стоит за шагом (`internalKey`, скрыто от пользователя).
 *
 * Шаги 10–17 — восемь субтестов CFIT (часть I: 1–4, часть II: 1–4) по методике
 * Кэттелла; шаги 18–24 — оставшиеся методики.
 *
 * Анкета (Тест 10 в исходной хронологии) исключена по требованию заказчика.
 */

import type { AuditStepConfig } from "@/lib/audit/auditTypes";

const MINUTE = 60;

export const AUDIT_STEPS: ReadonlyArray<AuditStepConfig> = [
  {
    stepIndex: 1,
    slug: "s01",
    answerKind: "pair_ab",
    itemCount: 80,
    timerSeconds: null,
    introKey: "intro_pairs_80",
    internalKey: "rowe_decision_styles",
    hasTimedFlow: false,
  },
  {
    stepIndex: 2,
    slug: "s02",
    answerKind: "mcq_single",
    itemCount: 10,
    timerSeconds: null,
    introKey: "intro_mcq3_10",
    internalKey: "goal_pursuit_short",
    hasTimedFlow: false,
  },
  {
    stepIndex: 3,
    slug: "s03",
    answerKind: "likert_4",
    itemCount: 12,
    timerSeconds: null,
    introKey: "intro_likert4_12",
    internalKey: "paperwork_style_short",
    hasTimedFlow: false,
  },
  {
    stepIndex: 4,
    slug: "s04",
    answerKind: "true_false",
    itemCount: 25,
    timerSeconds: null,
    introKey: "intro_truefalse_25",
    internalKey: "snyder_self_monitoring",
    hasTimedFlow: false,
  },
  {
    stepIndex: 5,
    slug: "s05",
    answerKind: "likert_5",
    itemCount: 25,
    timerSeconds: null,
    introKey: "intro_likert5_25",
    internalKey: "schubert_risk_full",
    hasTimedFlow: false,
  },
  {
    stepIndex: 6,
    slug: "s06",
    answerKind: "yes_no_unknown",
    itemCount: 20,
    timerSeconds: null,
    introKey: "intro_yesno_unknown_20",
    internalKey: "type_a_jenkins_short",
    hasTimedFlow: false,
  },
  {
    stepIndex: 7,
    slug: "s07",
    answerKind: "yes_no",
    itemCount: 15,
    timerSeconds: null,
    introKey: "intro_yesno_15",
    internalKey: "strelyau_temperament_short",
    hasTimedFlow: false,
  },
  {
    stepIndex: 8,
    slug: "s08",
    answerKind: "pair_ab",
    itemCount: 29,
    timerSeconds: null,
    introKey: "intro_pairs_29",
    internalKey: "rotter_locus",
    hasTimedFlow: false,
  },
  {
    stepIndex: 9,
    slug: "s09",
    answerKind: "likert_7",
    itemCount: 33,
    timerSeconds: null,
    introKey: "intro_likert7_33",
    internalKey: "tolerance_likert7_33",
    hasTimedFlow: false,
  },
  // CFIT — 8 субтестов (часть I: 4×4 мин / 3 мин; часть II: 4×3 мин) — PDF, табл. 4.
  {
    stepIndex: 10,
    slug: "s10-cfit-1",
    answerKind: "cfit_choice5",
    itemCount: 12,
    timerSeconds: 4 * MINUTE,
    introKey: "intro_cfit_1",
    internalKey: "cfit_subtest_1",
    hasTimedFlow: true,
  },
  {
    stepIndex: 11,
    slug: "s11-cfit-2",
    answerKind: "cfit_choice5",
    itemCount: 14,
    timerSeconds: 4 * MINUTE,
    introKey: "intro_cfit_2",
    internalKey: "cfit_subtest_2",
    hasTimedFlow: true,
  },
  {
    stepIndex: 12,
    slug: "s12-cfit-3",
    answerKind: "cfit_choice5",
    itemCount: 12,
    timerSeconds: 4 * MINUTE,
    introKey: "intro_cfit_3",
    internalKey: "cfit_subtest_3",
    hasTimedFlow: true,
  },
  {
    stepIndex: 13,
    slug: "s13-cfit-4",
    answerKind: "cfit_choice5",
    itemCount: 8,
    timerSeconds: 3 * MINUTE,
    introKey: "intro_cfit_4",
    internalKey: "cfit_subtest_4",
    hasTimedFlow: true,
  },
  {
    stepIndex: 14,
    slug: "s14-cfit-5",
    answerKind: "cfit_choice5",
    itemCount: 12,
    timerSeconds: 3 * MINUTE,
    introKey: "intro_cfit_5",
    internalKey: "cfit_subtest_5",
    hasTimedFlow: true,
  },
  {
    stepIndex: 15,
    slug: "s15-cfit-6",
    answerKind: "cfit_choice5",
    itemCount: 14,
    timerSeconds: 3 * MINUTE,
    introKey: "intro_cfit_6",
    internalKey: "cfit_subtest_6",
    hasTimedFlow: true,
  },
  {
    stepIndex: 16,
    slug: "s16-cfit-7",
    answerKind: "cfit_choice5",
    itemCount: 12,
    timerSeconds: 3 * MINUTE,
    introKey: "intro_cfit_7",
    internalKey: "cfit_subtest_7",
    hasTimedFlow: true,
  },
  {
    stepIndex: 17,
    slug: "s17-cfit-8",
    answerKind: "cfit_choice5",
    itemCount: 8,
    timerSeconds: 3 * MINUTE,
    introKey: "intro_cfit_8",
    internalKey: "cfit_subtest_8",
    hasTimedFlow: true,
  },
  {
    stepIndex: 18,
    slug: "s18",
    answerKind: "pair_ab",
    itemCount: 70,
    timerSeconds: 25 * MINUTE,
    introKey: "intro_keirsey_70",
    internalKey: "keirsey_temperament",
    hasTimedFlow: true,
  },
  {
    stepIndex: 19,
    slug: "s19",
    answerKind: "frequency_4",
    itemCount: 72,
    timerSeconds: 25 * MINUTE,
    introKey: "intro_mbi_72",
    internalKey: "maslach_burnout",
    hasTimedFlow: true,
  },
  {
    stepIndex: 20,
    slug: "s20",
    answerKind: "pair_ab",
    itemCount: 30,
    timerSeconds: 17 * MINUTE,
    introKey: "intro_thomas_30",
    internalKey: "thomas_kilmann_conflict",
    hasTimedFlow: true,
  },
  {
    stepIndex: 21,
    slug: "s21",
    answerKind: "gerchikov_mixed",
    itemCount: 16,
    timerSeconds: 15 * MINUTE,
    introKey: "intro_gerchikov_17",
    internalKey: "gerchikov_motivation_full",
    hasTimedFlow: true,
  },
  {
    stepIndex: 22,
    slug: "s22",
    answerKind: "likert_11",
    itemCount: 36,
    timerSeconds: 18 * MINUTE,
    introKey: "intro_likert11_36",
    internalKey: "pochebut_loyalty",
    hasTimedFlow: true,
  },
  {
    stepIndex: 23,
    slug: "s23",
    answerKind: "yes_no",
    itemCount: 40,
    timerSeconds: 18 * MINUTE,
    introKey: "intro_yesno_40",
    internalKey: "kos_communicative_organizational",
    hasTimedFlow: true,
  },
  {
    stepIndex: 24,
    slug: "s24",
    answerKind: "mcq_single",
    itemCount: null,
    timerSeconds: 18 * MINUTE,
    introKey: "intro_erudition",
    internalKey: "general_erudition_pool",
    hasTimedFlow: true,
    joinPreviousStep: true,
  },
  {
    stepIndex: 25,
    slug: "s25-maslach",
    answerKind: "maslach_likert_7",
    itemCount: 22,
    timerSeconds: 15 * MINUTE,
    introKey: "intro_maslach_mbi_22",
    internalKey: "maslach_mbi_short",
    hasTimedFlow: true,
  },
  {
    stepIndex: 26,
    slug: "s26-sectarian",
    answerKind: "mcq_single",
    itemCount: 38,
    timerSeconds: 9 * MINUTE,
    introKey: "intro_sectarianism_38",
    internalKey: "sectarianism_screening",
    hasTimedFlow: true,
  },
];

export const AUDIT_TOTAL_STEPS = AUDIT_STEPS.length;

/** Возвращает конфигурацию шага по slug; `null`, если slug неизвестен. */
export function getAuditStepBySlug(slug: string): AuditStepConfig | null {
  return AUDIT_STEPS.find((step) => step.slug === slug) ?? null;
}

/** Возвращает конфигурацию шага по индексу 1..AUDIT_TOTAL_STEPS; `null`, если индекс вне диапазона. */
export function getAuditStepByIndex(index: number): AuditStepConfig | null {
  if (!Number.isInteger(index) || index < 1 || index > AUDIT_TOTAL_STEPS) {
    return null;
  }
  return AUDIT_STEPS[index - 1] ?? null;
}

/** Возвращает следующий шаг или `null`, если текущий шаг последний. */
export function getNextAuditStep(currentIndex: number): AuditStepConfig | null {
  return getAuditStepByIndex(currentIndex + 1);
}
