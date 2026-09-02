import type { MaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import {
  buildMaslachBurnoutInterpretation,
  hasConcerningMaslachScale,
  isClassicMaslachBurnout,
  type MaslachBurnoutInterpretation,
} from "@/lib/burnout/maslachBurnoutInterpretation";

export type MaslachBurnoutCriticalSummary = {
  /** Классическая картина выгорания или отдельные неблагоприятные шкалы */
  critical: boolean;
  classicBurnout: boolean;
  eeHigh: boolean;
  dpHigh: boolean;
  paLow: boolean;
  ee: number | null;
  dp: number | null;
  pa: number | null;
  interpretation: MaslachBurnoutInterpretation | null;
};

/**
 * Возвращает true при классическом выгорании или неблагоприятных шкалах.
 */
export function isMaslachBurnoutCritical(scores: MaslachBurnoutScores): boolean {
  return buildMaslachBurnoutCriticalSummary(scores).critical;
}

/**
 * Сводка для уведомлений и цепочки напоминаний.
 */
export function buildMaslachBurnoutCriticalSummary(
  scores: MaslachBurnoutScores
): MaslachBurnoutCriticalSummary {
  const interpretation = buildMaslachBurnoutInterpretation(scores);
  const classicBurnout = isClassicMaslachBurnout(scores);
  const concerning = hasConcerningMaslachScale(scores);

  return {
    critical: classicBurnout || concerning,
    classicBurnout,
    eeHigh: interpretation?.ee.unfavorable === true && interpretation.ee.level === "high",
    dpHigh: interpretation?.dp.unfavorable === true && interpretation.dp.level === "high",
    paLow: interpretation?.pa.unfavorable === true && interpretation.pa.level === "low",
    ee: scores.ee,
    dp: scores.dp,
    pa: scores.pa,
    interpretation,
  };
}

/**
 * Краткое описание сработавших шкал для письма.
 */
export function formatMaslachCriticalScaleLines(
  summary: MaslachBurnoutCriticalSummary
): string[] {
  if (!summary.interpretation) {
    return [];
  }
  const lines: string[] = [];
  const { ee, dp, pa } = summary.interpretation;
  if (ee.unfavorable) {
    lines.push(`${ee.title}: ${String(ee.score)} — ${ee.levelLabel}`);
  }
  if (dp.unfavorable) {
    lines.push(`${dp.title}: ${String(dp.score)} — ${dp.levelLabel}`);
  }
  if (pa.unfavorable) {
    lines.push(`${pa.title}: ${String(pa.score)} — ${pa.levelLabel}`);
  }
  if (summary.classicBurnout) {
    lines.push("Классическая картина профессионального выгорания (высокие EE и DP, низкие PA).");
  }
  return lines;
}
