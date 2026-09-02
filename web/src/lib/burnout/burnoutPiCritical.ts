import type { RukavishnikovBandLevel } from "@/lib/audit/report/keys/auditScoringKeys";
import {
  burnoutBand,
  burnoutBandLabel,
  type BurnoutScores,
} from "@/lib/audit/report/computeMbiStep19";

/** Порог критического ПИ: «высокий» (40–49) и «крайне высокий» (50+). */
export const BURNOUT_PI_CRITICAL_MIN_SCORE = 40;

/**
 * Возвращает true, если уровень ПИ — высокий или крайне высокий.
 */
export function isBurnoutPiBandCritical(
  piBand: RukavishnikovBandLevel | null | undefined
): boolean {
  return piBand === "high" || piBand === "extremely_high";
}

/**
 * Возвращает true, если балл ПИ попадает в критический диапазон.
 */
export function isBurnoutPiScoreCritical(pi: number | null | undefined): boolean {
  if (pi === null || pi === undefined) {
    return false;
  }
  return isBurnoutPiBandCritical(burnoutBand("pi", pi));
}

/**
 * Сводка по ПИ для отчёта и уведомлений.
 */
export function buildBurnoutPiAlertSummary(
  scores: BurnoutScores
): {
  critical: boolean;
  score: number | null;
  bandLabel: string | null;
} {
  const critical = isBurnoutPiBandCritical(scores.piBand);
  return {
    critical,
    score: scores.pi,
    bandLabel:
      scores.pi !== null && critical ? burnoutBandLabel("pi", scores.pi) : null,
  };
}
