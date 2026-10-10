import type { RosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";

const DIRECTION_LABELS: Record<string, string> = {
  E: "вовне (экстрапунитивные)",
  I: "на себя (интропунитивные)",
  M: "безлично (импунитивные)",
};

const REACTION_LABELS: Record<string, string> = {
  OD: "с фиксацией на препятствии",
  ED: "с самозащитой / оправданием",
  NP: "с ориентацией на решение",
};

/**
 * Краткий понятный текст профиля по сводке кодирования Розенцвейга.
 */
export function buildRosenzweigProfileBlurb(
  summary: RosenzweigCodingSummary | null | undefined
): string | null {
  if (!summary || summary.codedCount === 0) {
    return null;
  }

  const topDirection = _topCategory(summary.directions);
  const topReaction = _topCategory(summary.reactions);
  if (!topDirection || !topReaction) {
    return null;
  }

  const dirShare = Math.round(topDirection.share * 100);
  const reactShare = Math.round(topReaction.share * 100);
  const coverage = `${String(summary.codedCount)} из ${String(summary.totalSituations)}`;

  return (
    `По закодированным ответам (${coverage}) преобладают реакции ${DIRECTION_LABELS[topDirection.key] ?? topDirection.key} ` +
    `(${String(dirShare)}%) и тип ${REACTION_LABELS[topReaction.key] ?? topReaction.key} ` +
    `(${String(reactShare)}%). Это рабочий профиль фрустрационных реакций для управленческого разбора; ` +
    `при сомнениях сверьте отдельные ситуации и при необходимости скорректируйте коды.`
  );
}

function _topCategory(
  rows: RosenzweigCodingSummary["directions"]
): { key: string; share: number } | null {
  let best: { key: string; share: number } | null = null;
  for (const row of rows) {
    if (!best || row.share > best.share) {
      best = { key: row.key, share: row.share };
    }
  }
  return best;
}
