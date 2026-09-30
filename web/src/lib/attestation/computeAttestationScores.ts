import {
  CBI_OPTIONS,
  CBI_QUESTIONS,
  KLIMOV_DDO_QUESTIONS,
  LUSCHER_COLORS,
  LUSCHER_IDEAL_RANK_BY_COLOR_ID,
  MANAGEMENT_POTENTIAL_QUESTIONS,
  MINI_IPIP_QUESTIONS,
  ROSENZWEIG_SITUATIONS,
  SPIELBERGER_QUESTIONS,
  luscherRankAnswerKey,
  type AttestationAnswers,
  type KlimovProfessionType,
  type MiniIpipFactor,
  type ManagementPotentialScale,
} from "@/lib/attestation/attestationQuestions";

export type ScoreBand = "low" | "mid" | "high";

export type MiniIpipScores = Record<MiniIpipFactor, number>;

export type ManagementPotentialScaleScore = {
  scale: ManagementPotentialScale;
  sum: number;
  band: ScoreBand;
};

export type CbiScaleScore = {
  scale: "personal" | "work";
  mean: number;
  band: ScoreBand;
};

export type SpielbergerScaleScore = {
  scale: "state" | "trait";
  total: number;
  band: ScoreBand;
};

export type KlimovDdoScores = Record<KlimovProfessionType, number>;

export type LuscherScores = {
  /** Суммарное отклонение от аутогенной нормы. */
  so: number;
  /** Вегетативный коэффициент (формула Шипоша). */
  vk: number;
  ranksByColorId: Readonly<Record<number, number>>;
};

export type RosenzweigAnswerPresence = {
  situationId: string;
  hasText: boolean;
};

export type AttestationComputedScores = {
  miniIpip: MiniIpipScores;
  managementPotential: ReadonlyArray<ManagementPotentialScaleScore>;
  cbi: ReadonlyArray<CbiScaleScore>;
  spielberger: ReadonlyArray<SpielbergerScaleScore>;
  klimovDdo: KlimovDdoScores;
  luscher: LuscherScores | null;
  rosenzweigTexts: ReadonlyArray<RosenzweigAnswerPresence>;
};

const MANAGEMENT_SCALES: ReadonlyArray<ManagementPotentialScale> = [
  "decision_making",
  "delegation",
  "stress_resilience",
  "team_leadership",
  "integrity",
];

const KLIMOV_TYPES: ReadonlyArray<KlimovProfessionType> = [
  "human_nature",
  "human_technique",
  "human_human",
  "human_sign_system",
  "human_artistic_image",
];

const CBI_OPTION_SCORE_BY_ID: Readonly<Record<number, number>> = Object.fromEntries(
  CBI_OPTIONS.map((option) => [option.id, option.score])
);

/**
 * Считает сводные показатели по ответам аттестации (без кодирования Розенцвейга).
 */
export function computeAttestationScores(answers: AttestationAnswers): AttestationComputedScores {
  return {
    miniIpip: _computeMiniIpip(answers),
    managementPotential: _computeManagementPotential(answers),
    cbi: _computeCbi(answers),
    spielberger: _computeSpielberger(answers),
    klimovDdo: _computeKlimovDdo(answers),
    luscher: _computeLuscher(answers),
    rosenzweigTexts: _computeRosenzweigPresence(answers),
  };
}

function _computeMiniIpip(answers: AttestationAnswers): MiniIpipScores {
  const totals: MiniIpipScores = {
    Extraversion: 0,
    Agreeableness: 0,
    Conscientiousness: 0,
    Neuroticism: 0,
    Openness: 0,
  };
  for (const question of MINI_IPIP_QUESTIONS) {
    const raw = answers[question.id];
    if (typeof raw !== "number") {
      continue;
    }
    const scored = question.reverse ? 6 - raw : raw;
    totals[question.factor] += scored;
  }
  return totals;
}

function _computeManagementPotential(
  answers: AttestationAnswers
): ReadonlyArray<ManagementPotentialScaleScore> {
  return MANAGEMENT_SCALES.map((scale) => {
    let sum = 0;
    for (const question of MANAGEMENT_POTENTIAL_QUESTIONS) {
      if (question.scale !== scale) {
        continue;
      }
      const raw = answers[question.id];
      if (typeof raw !== "number") {
        continue;
      }
      sum += question.reverse ? 6 - raw : raw;
    }
    return {
      scale,
      sum,
      band: _managementBand(sum),
    };
  });
}

function _managementBand(sum: number): ScoreBand {
  if (sum <= 11) {
    return "low";
  }
  if (sum <= 18) {
    return "mid";
  }
  return "high";
}

function _computeCbi(answers: AttestationAnswers): ReadonlyArray<CbiScaleScore> {
  const scales: ReadonlyArray<"personal" | "work"> = ["personal", "work"];
  return scales.map((scale) => {
    const itemScores: number[] = [];
    for (const question of CBI_QUESTIONS) {
      if (question.scale !== scale) {
        continue;
      }
      const raw = answers[question.id];
      if (typeof raw !== "number") {
        continue;
      }
      const mapped = CBI_OPTION_SCORE_BY_ID[raw] ?? 0;
      const scored = question.reverse ? 100 - mapped : mapped;
      itemScores.push(scored);
    }
    const mean =
      itemScores.length > 0
        ? itemScores.reduce((acc, value) => acc + value, 0) / itemScores.length
        : 0;
    return {
      scale,
      mean,
      band: _cbiBand(mean),
    };
  });
}

function _cbiBand(mean: number): ScoreBand {
  if (mean < 50) {
    return "low";
  }
  if (mean < 75) {
    return "mid";
  }
  return "high";
}

function _computeSpielberger(answers: AttestationAnswers): ReadonlyArray<SpielbergerScaleScore> {
  const scales: ReadonlyArray<"state" | "trait"> = ["state", "trait"];
  return scales.map((scale) => {
    let sumDirect = 0;
    let sumReverseRaw = 0;
    for (const question of SPIELBERGER_QUESTIONS) {
      if (question.scale !== scale) {
        continue;
      }
      const raw = answers[question.id];
      if (typeof raw !== "number") {
        continue;
      }
      if (question.reverse) {
        sumReverseRaw += raw;
      } else {
        sumDirect += raw;
      }
    }
    const total = sumDirect - sumReverseRaw + 35;
    return {
      scale,
      total,
      band: _spielbergerBand(total),
    };
  });
}

function _spielbergerBand(total: number): ScoreBand {
  if (total < 30) {
    return "low";
  }
  if (total <= 44) {
    return "mid";
  }
  return "high";
}

function _computeKlimovDdo(answers: AttestationAnswers): KlimovDdoScores {
  const counts = _emptyKlimovCounts();
  for (const question of KLIMOV_DDO_QUESTIONS) {
    const raw = answers[question.id];
    if (raw === "a") {
      counts[question.typeIfA] += 1;
    } else if (raw === "b") {
      counts[question.typeIfB] += 1;
    }
  }
  return counts;
}

function _emptyKlimovCounts(): KlimovDdoScores {
  const counts = {} as KlimovDdoScores;
  for (const type of KLIMOV_TYPES) {
    counts[type] = 0;
  }
  return counts;
}

function _computeLuscher(answers: AttestationAnswers): LuscherScores | null {
  const ranksByColorId: Record<number, number> = {};
  for (const color of LUSCHER_COLORS) {
    const value = answers[luscherRankAnswerKey(color.id)];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 8) {
      return null;
    }
    ranksByColorId[color.id] = value;
  }

  let so = 0;
  for (const color of LUSCHER_COLORS) {
    const rank = ranksByColorId[color.id] ?? 0;
    const ideal = LUSCHER_IDEAL_RANK_BY_COLOR_ID[color.id] ?? 0;
    so += Math.abs(rank - ideal);
  }

  const pref = (colorId: number): number => 9 - (ranksByColorId[colorId] ?? 0);
  const prefRed = pref(3);
  const prefYellow = pref(4);
  const prefBlue = pref(1);
  const prefGreen = pref(2);
  const denominator = prefBlue + prefGreen;
  const vk = denominator > 0 ? (prefRed + prefYellow) / denominator : 0;

  return { so, vk, ranksByColorId };
}

function _computeRosenzweigPresence(
  answers: AttestationAnswers
): ReadonlyArray<RosenzweigAnswerPresence> {
  return ROSENZWEIG_SITUATIONS.map((situation) => {
    const value = answers[situation.id];
    return {
      situationId: situation.id,
      hasText: typeof value === "string" && value.trim().length > 0,
    };
  });
}
