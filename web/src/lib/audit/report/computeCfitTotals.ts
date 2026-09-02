import type { AuditAnswersMap, AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { computeCfitScoredTotals } from "@/lib/audit/report/computeAuditMethodologyScores";
import {
  CFIT_ADULT_IQ_BY_RAW,
  CFIT_ADULT_IQ_MAX_RAW,
  CFIT_ADULT_IQ_MIN_RAW,
  CFIT_AUDIT_STEP_INDICES,
  CFIT_AUDIT_STEP_LAYOUT,
  CFIT_IQ_INTERPRETATION_TEXT,
  CFIT_ITEM_COUNT_TOTAL,
  cfitIqTableRawScore,
} from "@/lib/audit/report/keys/auditScoringKeys";

const CFIT_STEPS = CFIT_AUDIT_STEP_INDICES;
const CFIT_PART1_STEPS = new Set([10, 11, 12, 13]);
const CFIT_PART2_STEPS = new Set([14, 15, 16, 17]);

export type CfitTotals = {
  answeredTotal: number;
  questionsTotal: number;
  correctTotal: number;
  scorableTotal: number;
  part1Correct: number;
  part1Scorable: number;
  part2Correct: number;
  part2Scorable: number;
  iq: number | null;
  /** Строка «общая сумма» из таблицы прил. III для пересчёта в IQ; null если raw < 21. */
  iqLookupRaw: number | null;
  iqBand: "low" | "normal" | "high" | null;
  byStep: ReadonlyArray<{
    stepIndex: number;
    part: 1 | 2;
    subtest: number;
    answered: number;
    total: number;
    correct: number;
    scorable: number;
  }>;
};

function countAnsweredInStep(step: AuditStepAnswers | undefined): { answered: number; total: number } {
  if (!step) {
    return { answered: 0, total: 0 };
  }
  const keys = Object.keys(step).filter((k) => /^q\d+$/.test(k));
  let answered = 0;
  for (const k of keys) {
    const v = step[k];
    if (v !== null && v !== undefined && v !== "") {
      answered += 1;
    }
  }
  return { answered, total: keys.length };
}

function _stepLayout(stepIndex: number): { part: 1 | 2; subtest: number } {
  const layout = CFIT_AUDIT_STEP_LAYOUT.find((entry) => entry.stepIndex === stepIndex);
  if (!layout) {
    return { part: 1, subtest: 1 };
  }
  return { part: layout.part, subtest: layout.subtest };
}

/** Переводит фактический сырой балл в IQ по таблице «общая сумма» (прил. III, 18+). */
export function cfitAdultIqFromRaw(raw: number): number | null {
  const tableRaw = cfitIqTableRawScore(raw);
  if (tableRaw === null) {
    return null;
  }
  return CFIT_ADULT_IQ_BY_RAW[tableRaw] ?? null;
}

/** Краткая строка IQ для отчёта с учётом таблицы 21–88. */
export function formatCfitIqReportLine(totals: CfitTotals): string {
  if (totals.iq === null || totals.iqBand === null) {
    if (totals.correctTotal < CFIT_ADULT_IQ_MIN_RAW) {
      return (
        `IQ: не определён (сырой балл ${String(totals.correctTotal)} ниже минимума таблицы — ` +
        `${String(CFIT_ADULT_IQ_MIN_RAW)})`
      );
    }
    return "IQ: не определён";
  }
  const band = cfitIqBandLabel(totals.iqBand);
  if (
    totals.iqLookupRaw !== null &&
    totals.correctTotal > CFIT_ADULT_IQ_MAX_RAW
  ) {
    return (
      `IQ (взрослые 18+): ${String(totals.iq)} (${band}); по таблице для общей суммы ` +
      `${String(totals.iqLookupRaw)} (фактический сырой ${String(totals.correctTotal)} из ` +
      `${String(CFIT_ITEM_COUNT_TOTAL)})`
    );
  }
  if (totals.iqLookupRaw !== null) {
    return (
      `IQ (взрослые 18+): ${String(totals.iq)} (${band}); общая сумма по таблице: ` +
      `${String(totals.iqLookupRaw)}`
    );
  }
  return `IQ (взрослые 18+): ${String(totals.iq)} (${band})`;
}

/** Классификация IQ по методике CFIT. */
export function cfitIqBand(iq: number): "low" | "normal" | "high" {
  if (iq < 90) {
    return "low";
  }
  if (iq <= 110) {
    return "normal";
  }
  return "high";
}

/** Подпись уровня IQ для отчёта. */
export function cfitIqBandLabel(band: "low" | "normal" | "high"): string {
  if (band === "low") {
    return "ниже средней нормы (возможное отставание в умственном развитии)";
  }
  if (band === "high") {
    return "выше средней нормы (возможная одаренность)";
  }
  return "средняя норма";
}

/**
 * Агрегирует ответы CFIT: верные по ключу, суммы по частям I/II, IQ для взрослых 18+.
 */
export function computeCfitTotals(answers: AuditAnswersMap): CfitTotals {
  const scored = computeCfitScoredTotals(answers);
  if (scored.byStep.length > 0) {
    return _enrichCfitTotals(scored);
  }
  let answeredTotal = 0;
  let questionsTotal = 0;
  const byStep: CfitTotals["byStep"][number][] = [];
  for (const stepIndex of CFIT_STEPS) {
    const { answered, total } = countAnsweredInStep(answers[stepIndex]);
    const layout = _stepLayout(stepIndex);
    answeredTotal += answered;
    questionsTotal += total;
    byStep.push({
      stepIndex,
      part: layout.part,
      subtest: layout.subtest,
      answered,
      total,
      correct: 0,
      scorable: 0,
    });
  }
  return {
    answeredTotal,
    questionsTotal,
    correctTotal: 0,
    scorableTotal: 0,
    part1Correct: 0,
    part1Scorable: 0,
    part2Correct: 0,
    part2Scorable: 0,
    iq: null,
    iqLookupRaw: null,
    iqBand: null,
    byStep,
  };
}

/** Полный текст интерпретации Теста 10 (CFIT). */
export function cfitInterpretation(totals: CfitTotals): string {
  const methodNote =
    "Культурно-свободный тест на интеллект (CFIT, Р. Кэттелл) измеряет уровень " +
    "интеллектуального развития с минимальным влиянием культуры и образования. " +
    `В данном аудите — полная методика: 8 субтестов (часть I: 1-4, часть II: 1-4), ` +
    `${String(CFIT_ITEM_COUNT_TOTAL)} заданий. Сырой балл — сумма правильных ответов по ключу ` +
    "(прил. II); для перевода в IQ по таблице «общая сумма» для взрослых старше 18 лет " +
    `(прил. III) используется диапазон ${String(CFIT_ADULT_IQ_MIN_RAW)}–${String(CFIT_ADULT_IQ_MAX_RAW)} ` +
    "(при большем сыром балле применяется строка таблицы 88). " +
    CFIT_IQ_INTERPRETATION_TEXT;

  if (totals.scorableTotal === 0) {
    return `${methodNote} Данных CFIT пока нет.`;
  }

  if (totals.answeredTotal < totals.scorableTotal) {
    const partial =
      `Ответов ${String(totals.answeredTotal)} из ${String(totals.scorableTotal)}. ` +
      "Предварительный подсчёт по имеющимся ответам; для надёжной интерпретации " +
      "нужны все задания.";
    return `${methodNote} ${partial} ${_cfitScoreSummary(totals)}`;
  }

  return `${methodNote} ${_cfitScoreSummary(totals)}`;
}

function _enrichCfitTotals(scored: ReturnType<typeof computeCfitScoredTotals>): CfitTotals {
  let part1Correct = 0;
  let part1Scorable = 0;
  let part2Correct = 0;
  let part2Scorable = 0;
  const byStep = scored.byStep.map((step) => {
    const layout = _stepLayout(step.stepIndex);
    if (CFIT_PART1_STEPS.has(step.stepIndex)) {
      part1Correct += step.correct;
      part1Scorable += step.scorable;
    }
    if (CFIT_PART2_STEPS.has(step.stepIndex)) {
      part2Correct += step.correct;
      part2Scorable += step.scorable;
    }
    return {
      ...step,
      part: layout.part,
      subtest: layout.subtest,
    };
  });
  const iqLookupRaw = cfitIqTableRawScore(scored.correctTotal);
  const iq = cfitAdultIqFromRaw(scored.correctTotal);
  return {
    ...scored,
    part1Correct,
    part1Scorable,
    part2Correct,
    part2Scorable,
    iq,
    iqLookupRaw,
    iqBand: iq !== null ? cfitIqBand(iq) : null,
    byStep,
  };
}

function _cfitScoreSummary(totals: CfitTotals): string {
  const raw = totals.correctTotal;
  const iqPart = _cfitIqSummaryClause(totals);
  return (
    `Заключение: часть I - ${String(totals.part1Correct)} из ${String(totals.part1Scorable)} ` +
    `верных; часть II - ${String(totals.part2Correct)} из ${String(totals.part2Scorable)} ` +
    `верных; общий сырой балл - ${String(raw)} из ${String(CFIT_ITEM_COUNT_TOTAL)}. ${iqPart}`
  );
}

function _cfitIqSummaryClause(totals: CfitTotals): string {
  const raw = totals.correctTotal;
  if (totals.iq === null || totals.iqBand === null) {
    if (raw < CFIT_ADULT_IQ_MIN_RAW) {
      return (
        `Сырой балл ${String(raw)} ниже минимума таблицы «общая сумма» ` +
        `(${String(CFIT_ADULT_IQ_MIN_RAW)}); IQ не определяется.`
      );
    }
    return "IQ не определён.";
  }
  const band = cfitIqBandLabel(totals.iqBand);
  if (totals.iqLookupRaw !== null && raw > CFIT_ADULT_IQ_MAX_RAW) {
    return (
      `Для пересчёта в IQ по таблице (взрослые 18+) применена строка общей суммы ` +
      `${String(totals.iqLookupRaw)} (максимум таблицы; фактический сырой ${String(raw)}). ` +
      `Стандартная оценка IQ: ${String(totals.iq)} (${band}).`
    );
  }
  return (
    `Общая сумма по таблице: ${String(totals.iqLookupRaw ?? raw)}. ` +
    `Стандартная оценка IQ: ${String(totals.iq)} (${band}).`
  );
}
