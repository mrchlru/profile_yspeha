import type { AuditStepAnswers } from "@/lib/audit/auditAnswers";
import type { AuditStep19FrequencyId } from "@/lib/audit/questions/step19Maslach";
import { computeRukavishnikovWorkerLoadFromSums } from "@/lib/audit/report/computeRukavishnikovWorkerLoadIndex";
import {
  RUKAVISHNIKOV_BANDS,
  RUKAVISHNIKOV_IPV_DESCRIPTION,
  RUKAVISHNIKOV_LO_ITEMS,
  RUKAVISHNIKOV_PI_ITEMS,
  RUKAVISHNIKOV_PM_ITEMS,
  RUKAVISHNIKOV_SCALE_DESCRIPTIONS,
  RUKAVISHNIKOV_WORKER_LOAD_DESCRIPTION,
  type RukavishnikovBandLevel,
  type RukavishnikovScaleId,
} from "@/lib/audit/report/keys/auditScoringKeys";

const TOTAL_ITEMS = 72;

/**
 * Переводит частоту ответа (Тест 12) в числовой балл 0..3.
 * «Часто» - 3, «обычно» - 2, «редко» - 1, «никогда» - 0.
 */
export function burnoutFrequencyToScore(id: AuditStep19FrequencyId | string): number | null {
  switch (id) {
    case "never":
      return 0;
    case "rare":
      return 1;
    case "often":
      return 3;
    case "usually":
      return 2;
    default:
      return null;
  }
}

/** @deprecated Используйте burnoutFrequencyToScore. */
export const mbiFrequencyToScore = burnoutFrequencyToScore;

export type BurnoutScores = {
  pi: number | null;
  lo: number | null;
  pm: number | null;
  /** ИПВ — сумма ПИ + ЛО + ПМ (методика Рукавишникова). */
  ipv: number | null;
  /** ИЗР — индекс рабочей загрузки, шкала 0–100. */
  workerLoad: number | null;
  piBand: RukavishnikovBandLevel | null;
  loBand: RukavishnikovBandLevel | null;
  pmBand: RukavishnikovBandLevel | null;
  ipvBand: RukavishnikovBandLevel | null;
  workerLoadBand: RukavishnikovBandLevel | null;
  answeredCount: number;
  totalItems: number;
};

/** Считает шкалы ПИ, ЛО, ПМ, ИПВ и индекс рабочей загрузки (ИЗР). */
export function computeBurnoutScores(answers: AuditStepAnswers | undefined): BurnoutScores {
  const empty: BurnoutScores = {
    pi: null,
    lo: null,
    pm: null,
    ipv: null,
    workerLoad: null,
    piBand: null,
    loBand: null,
    pmBand: null,
    ipvBand: null,
    workerLoadBand: null,
    answeredCount: 0,
    totalItems: TOTAL_ITEMS,
  };
  if (!answers) {
    return empty;
  }

  let answeredCount = 0;
  for (let qi = 1; qi <= TOTAL_ITEMS; qi += 1) {
    if (typeof answers[`q${String(qi)}`] === "string") {
      answeredCount += 1;
    }
  }

  const scoreAt = (index: number): number | null => {
    const raw = answers[`q${String(index)}`];
    if (typeof raw !== "string") {
      return null;
    }
    return burnoutFrequencyToScore(raw);
  };

  const sumScale = (items: ReadonlyArray<number>): number | null => {
    let sum = 0;
    for (let i = 0; i < items.length; i += 1) {
      const score = scoreAt(items[i] ?? 0);
      if (score === null) {
        return null;
      }
      sum += score;
    }
    return sum;
  };

  const pi = sumScale(RUKAVISHNIKOV_PI_ITEMS);
  const lo = sumScale(RUKAVISHNIKOV_LO_ITEMS);
  const pm = sumScale(RUKAVISHNIKOV_PM_ITEMS);
  const ipv = pi !== null && lo !== null && pm !== null ? pi + lo + pm : null;
  const workerLoad = computeRukavishnikovWorkerLoadFromSums(pi, lo, pm);

  return {
    pi,
    lo,
    pm,
    ipv,
    workerLoad,
    piBand: pi !== null ? burnoutBand("pi", pi) : null,
    loBand: lo !== null ? burnoutBand("lo", lo) : null,
    pmBand: pm !== null ? burnoutBand("pm", pm) : null,
    ipvBand: ipv !== null ? burnoutBand("ipv", ipv) : null,
    workerLoadBand: workerLoad !== null ? burnoutBand("worker_load", workerLoad) : null,
    answeredCount,
    totalItems: TOTAL_ITEMS,
  };
}

/** @deprecated Используйте computeBurnoutScores. */
export const computeMbiStep19Scores = computeBurnoutScores;

/** @deprecated Используйте BurnoutScores. */
export type MbiScores = BurnoutScores;

/** Определяет уровень по таблице 9 (или по шкале ИЗР). */
export function burnoutBand(scale: RukavishnikovScaleId, score: number): RukavishnikovBandLevel {
  const bands = RUKAVISHNIKOV_BANDS[scale];
  for (let i = 0; i < bands.length; i += 1) {
    const band = bands[i];
    if (band === undefined) {
      continue;
    }
    if (score >= band.min && (band.max === null || score <= band.max)) {
      if (i === 0) {
        return "extremely_low";
      }
      if (i === 1) {
        return "low";
      }
      if (i === 2) {
        return "mid";
      }
      if (i === 3) {
        return "high";
      }
      return "extremely_high";
    }
  }
  return "extremely_high";
}

/** Подпись уровня для отчёта. */
export function burnoutBandLabel(scale: RukavishnikovScaleId, score: number): string {
  const band = burnoutBand(scale, score);
  const bands = RUKAVISHNIKOV_BANDS[scale];
  const info =
    band === "extremely_low"
      ? bands[0]
      : band === "low"
        ? bands[1]
        : band === "mid"
          ? bands[2]
          : band === "high"
            ? bands[3]
            : bands[4];
  return info?.label ?? band;
}

/** Полный текст интерпретации Теста 12. */
export function burnoutInterpretation(scores: BurnoutScores): string {
  const scalesText =
    `${RUKAVISHNIKOV_SCALE_DESCRIPTIONS.pi} ${RUKAVISHNIKOV_SCALE_DESCRIPTIONS.lo} ` +
    `${RUKAVISHNIKOV_SCALE_DESCRIPTIONS.pm} ${RUKAVISHNIKOV_IPV_DESCRIPTION} ` +
    RUKAVISHNIKOV_WORKER_LOAD_DESCRIPTION;

  if (scores.answeredCount === 0) {
    return `${scalesText} Данных опросника пока нет.`;
  }

  if (scores.answeredCount < scores.totalItems) {
    return (
      `${scalesText} Ответов ${String(scores.answeredCount)} из ${String(scores.totalItems)}. ` +
      "Предварительный подсчёт; для надёжной интерпретации нужны все 72 утверждения."
    );
  }

  if (
    scores.pi === null ||
    scores.lo === null ||
    scores.pm === null ||
    scores.ipv === null ||
    scores.workerLoad === null ||
    scores.piBand === null ||
    scores.loBand === null ||
    scores.pmBand === null ||
    scores.ipvBand === null ||
    scores.workerLoadBand === null
  ) {
    return `${scalesText} Недостаточно данных для заключения.`;
  }

  return (
    `${scalesText} Заключение: ПИ - ${String(scores.pi)} баллов (${burnoutBandLabel("pi", scores.pi)}); ` +
    `ЛО - ${String(scores.lo)} (${burnoutBandLabel("lo", scores.lo)}); ` +
    `ПМ - ${String(scores.pm)} (${burnoutBandLabel("pm", scores.pm)}); ` +
    `ИПВ - ${String(scores.ipv)} (${burnoutBandLabel("ipv", scores.ipv)}); ` +
    `ИЗР - ${String(scores.workerLoad)} (${burnoutBandLabel("worker_load", scores.workerLoad)}). ` +
    "Для ПИ и ЛО более высокие уровни указывают на более выраженное выгорание; " +
    "для ПМ низкий уровень отражает снижение профессиональной мотивации."
  );
}
