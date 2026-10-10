import { ROSENZWEIG_SITUATIONS } from "@/lib/attestation/attestationQuestions";

/** Направление реакции: экстра-, интро- или импунитивная. */
export type RosenzweigDirection = "E" | "I" | "M";

/** Тип реакции: фиксация на препятствии, эго-защите или решении. */
export type RosenzweigReaction = "OD" | "ED" | "NP";

export type RosenzweigSituationCoding = {
  direction: RosenzweigDirection;
  reaction: RosenzweigReaction;
};

/** Карта кодирования наблюдателя по ситуациям (`rz_q1` …). */
export type RosenzweigCodingMap = Partial<Record<string, RosenzweigSituationCoding>>;

export type RosenzweigCategoryCount = {
  key: string;
  count: number;
  share: number;
};

export type RosenzweigCodingSummary = {
  directions: ReadonlyArray<RosenzweigCategoryCount>;
  reactions: ReadonlyArray<RosenzweigCategoryCount>;
  codedCount: number;
  totalSituations: number;
};

const DIRECTION_KEYS: ReadonlyArray<RosenzweigDirection> = ["E", "I", "M"];
const REACTION_KEYS: ReadonlyArray<RosenzweigReaction> = ["OD", "ED", "NP"];

/**
 * Считает число полностью закодированных ситуаций (direction + reaction).
 */
export function countRosenzweigCodedEntries(coding: RosenzweigCodingMap): number {
  let count = 0;
  for (const situation of ROSENZWEIG_SITUATIONS) {
    const entry = coding[situation.id];
    if (entry?.direction && entry?.reaction) {
      count += 1;
    }
  }
  return count;
}

/**
 * Сводит кодирование Розенцвейга: количество и доли по направлениям и типам реакции.
 */
export function computeRosenzweigCodingSummary(
  coding: RosenzweigCodingMap
): RosenzweigCodingSummary {
  const directionCounts: Record<RosenzweigDirection, number> = { E: 0, I: 0, M: 0 };
  const reactionCounts: Record<RosenzweigReaction, number> = { OD: 0, ED: 0, NP: 0 };
  let codedCount = 0;

  for (const situation of ROSENZWEIG_SITUATIONS) {
    const entry = coding[situation.id];
    if (!entry) {
      continue;
    }
    directionCounts[entry.direction] += 1;
    reactionCounts[entry.reaction] += 1;
    codedCount += 1;
  }

  const directions = DIRECTION_KEYS.map((key) =>
    _toCategoryCount(key, directionCounts[key], codedCount)
  );
  const reactions = REACTION_KEYS.map((key) =>
    _toCategoryCount(key, reactionCounts[key], codedCount)
  );

  return {
    directions,
    reactions,
    codedCount,
    totalSituations: ROSENZWEIG_SITUATIONS.length,
  };
}

function _toCategoryCount(key: string, count: number, codedCount: number): RosenzweigCategoryCount {
  const share = codedCount > 0 ? count / codedCount : 0;
  return { key, count, share };
}
