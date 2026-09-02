import {
  RUKAVISHNIKOV_LO_ITEMS,
  RUKAVISHNIKOV_PI_ITEMS,
  RUKAVISHNIKOV_PM_ITEMS,
} from "@/lib/audit/report/keys/auditScoringKeys";

/** Максимальные сырые баллы шкал (все пункты ответили «часто» = 3). */
export const RUKAVISHNIKOV_SCALE_RAW_MAX = {
  pi: RUKAVISHNIKOV_PI_ITEMS.length * 3,
  lo: RUKAVISHNIKOV_LO_ITEMS.length * 3,
  pm: RUKAVISHNIKOV_PM_ITEMS.length * 3,
} as const;

export type RukavishnikovScaleKey = keyof typeof RUKAVISHNIKOV_SCALE_RAW_MAX;

/** Шкала ИЗР — 0–100. */
export const RUKAVISHNIKOV_WORKER_LOAD_SCALE_MAX = 100;

/** Максимум суммарного ИПВ (ПИ + ЛО + ПМ при максимальных сырых баллах). */
export const RUKAVISHNIKOV_IPV_SUM_MAX =
  RUKAVISHNIKOV_SCALE_RAW_MAX.pi +
  RUKAVISHNIKOV_SCALE_RAW_MAX.lo +
  RUKAVISHNIKOV_SCALE_RAW_MAX.pm;

/** Краткое имя индекса в отчётах и UI. */
export const RUKAVISHNIKOV_WORKER_LOAD_INDEX_SHORT = "ИЗР";

/** Полное имя индекса. */
export const RUKAVISHNIKOV_WORKER_LOAD_INDEX_FULL = "Индекс рабочей загрузки";

/** Текстовая формула ИЗР для отчётов и UI. */
export const RUKAVISHNIKOV_WORKER_LOAD_FORMULA_TEXT =
  "(0,5×ПИриск + 0,3×ЛОриск + 0,2×ПМриск) × 100";

/**
 * Коэффициент риска по сырому баллу ПИ (0–1).
 */
export function piRiskCoefficient(raw: number): number {
  if (raw <= 20) {
    return 0;
  }
  if (raw <= 39) {
    return 0.4;
  }
  if (raw <= 49) {
    return 0.8;
  }
  return 1;
}

/**
 * Коэффициент риска по сырому баллу ЛО (0–1).
 */
export function loRiskCoefficient(raw: number): number {
  if (raw <= 16) {
    return 0;
  }
  if (raw <= 31) {
    return 0.4;
  }
  if (raw <= 40) {
    return 0.8;
  }
  return 1;
}

/**
 * Коэффициент риска по сырому баллу ПМ (0–1): чем ниже мотивация, тем выше риск.
 */
export function pmRiskCoefficient(raw: number): number {
  if (raw >= 32) {
    return 0;
  }
  if (raw >= 25) {
    return 0.2;
  }
  if (raw >= 13) {
    return 0.5;
  }
  if (raw >= 8) {
    return 0.8;
  }
  return 1;
}

export type OverloadRiskCoefficients = {
  piRisk: number;
  loRisk: number;
  pmRisk: number;
};

/** Возвращает коэффициенты риска ПИ, ЛО и ПМ по таблицам зон. */
export function computeOverloadRiskCoefficients(
  pi: number,
  lo: number,
  pm: number
): OverloadRiskCoefficients {
  return {
    piRisk: piRiskCoefficient(pi),
    loRisk: loRiskCoefficient(lo),
    pmRisk: pmRiskCoefficient(pm),
  };
}

/**
 * Индекс рабочей загрузки (ИЗР), шкала 0–100:
 * (0,5×ПИриск + 0,3×ЛОриск + 0,2×ПМриск) × 100.
 */
export function computeRukavishnikovWorkerLoadIndex(pi: number, lo: number, pm: number): number {
  const { piRisk, loRisk, pmRisk } = computeOverloadRiskCoefficients(pi, lo, pm);
  const index = (0.5 * piRisk + 0.3 * loRisk + 0.2 * pmRisk) * 100;
  return Math.round(Math.min(RUKAVISHNIKOV_WORKER_LOAD_SCALE_MAX, Math.max(0, index)));
}

/** Считает ИЗР, если все три шкалы заданы. */
export function computeRukavishnikovWorkerLoadFromSums(
  pi: number | null,
  lo: number | null,
  pm: number | null
): number | null {
  if (pi === null || lo === null || pm === null) {
    return null;
  }
  return computeRukavishnikovWorkerLoadIndex(pi, lo, pm);
}
