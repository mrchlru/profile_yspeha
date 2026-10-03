import { sanitizeForAiInput } from "@/lib/ai/sanitizeForAi";
import {
  CBI_SCALE_LABELS,
  KLIMOV_TYPE_LABELS,
  MANAGEMENT_POTENTIAL_SCALE_LABELS,
  SPIELBERGER_SCALE_LABELS,
  scoreBandLabel,
} from "@/lib/attestation/attestationLabels";
import type { AttestationComputedScores } from "@/lib/attestation/computeAttestationScores";
import type { KlimovProfessionType } from "@/lib/attestation/attestationQuestions";
import {
  MINI_IPIP_BAND_HINT,
  buildMiniIpipInterpretations,
} from "@/lib/attestation/miniIpipInterpretation";
import type { RosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";

const ROSENZWEIG_DIRECTION_LABELS: Record<string, string> = {
  E: "E — внешне (экстрапунитивная)",
  I: "I — на себя (интропунитивная)",
  M: "M — безлично (импунитивная)",
};

const ROSENZWEIG_REACTION_LABELS: Record<string, string> = {
  OD: "OD — фиксация на препятствии",
  ED: "ED — эго-защита",
  NP: "NP — решение задачи",
};

/**
 * Собирает структурированный контекст для LLM по результатам аттестации.
 */
export function buildAttestationConclusionContext(input: {
  personName: string;
  scores: AttestationComputedScores;
  rosenzweigCodingSummary: RosenzweigCodingSummary | null;
}): string {
  const { scores } = input;
  const safeName = sanitizeForAiInput(input.personName, 120);

  const bigFive = buildMiniIpipInterpretations(scores.miniIpip).map((item) => ({
    label: item.label,
    score: item.score,
    band: scoreBandLabel(item.band),
    meaning: item.meaning,
    interpretation: item.levelText,
    note: MINI_IPIP_BAND_HINT,
  }));

  const managementPotential = scores.managementPotential.map((row) => ({
    label: MANAGEMENT_POTENTIAL_SCALE_LABELS[row.scale],
    sum: row.sum,
    band: scoreBandLabel(row.band),
    note: "сумма 5–25; низкий 5–11, средний 12–18, высокий 19–25",
  }));

  const cbi = scores.cbi.map((row) => ({
    label: CBI_SCALE_LABELS[row.scale],
    mean: Number(row.mean.toFixed(1)),
    band: scoreBandLabel(row.band),
    note: "средний балл; низкий <50, средний 50–74, высокий ≥75",
  }));

  const spielberger = scores.spielberger.map((row) => ({
    label: SPIELBERGER_SCALE_LABELS[row.scale],
    total: row.total,
    band: scoreBandLabel(row.band),
    note: "низкая <30, средняя 31–44, высокая ≥45",
  }));

  const klimovEntries = (Object.keys(KLIMOV_TYPE_LABELS) as KlimovProfessionType[]).map(
    (type) => ({
      label: KLIMOV_TYPE_LABELS[type],
      count: scores.klimovDdo[type] ?? 0,
    })
  );
  const klimovLeader = _topKlimovType(scores.klimovDdo);

  const luscher =
    scores.luscher !== null
      ? {
          so: Number(scores.luscher.so.toFixed(1)),
          vk: Number(scores.luscher.vk.toFixed(2)),
          note: "СО — суммарное отклонение от нормы; ВК — вегетативный коэффициент",
        }
      : null;

  const rosenzweigFilled = scores.rosenzweigTexts.filter((item) => item.hasText).length;
  const rosenzweigSummary = input.rosenzweigCodingSummary
    ? {
        codedCount: input.rosenzweigCodingSummary.codedCount,
        totalSituations: input.rosenzweigCodingSummary.totalSituations,
        directions: input.rosenzweigCodingSummary.directions.map((row) => ({
          code: row.key,
          label: ROSENZWEIG_DIRECTION_LABELS[row.key] ?? row.key,
          count: row.count,
          sharePercent: Math.round(row.share * 100),
        })),
        reactions: input.rosenzweigCodingSummary.reactions.map((row) => ({
          code: row.key,
          label: ROSENZWEIG_REACTION_LABELS[row.key] ?? row.key,
          count: row.count,
          sharePercent: Math.round(row.share * 100),
        })),
      }
    : null;

  const payload = {
    participantName: safeName,
    testName: "Аттестация управляющего / шеф-повара",
    bigFive,
    managementPotential,
    cbiBurnout: cbi,
    spielbergerAnxiety: spielberger,
    klimovDdo: { types: klimovEntries, leadingType: klimovLeader },
    luscher,
    rosenzweig: {
      freeTextAnswersProvided: rosenzweigFilled,
      freeTextAnswersTotal: scores.rosenzweigTexts.length,
      observerCodingSummary: rosenzweigSummary,
      note: "Свободные тексты ответов не передаются в модель — только сводка кодирования наблюдателя.",
    },
  };

  return JSON.stringify(payload, null, 2);
}

function _topKlimovType(scores: AttestationComputedScores["klimovDdo"]): string {
  let top: KlimovProfessionType = "human_nature";
  let max = -1;
  for (const [key, value] of Object.entries(scores) as [KlimovProfessionType, number][]) {
    if (value > max) {
      max = value;
      top = key;
    }
  }
  return `${KLIMOV_TYPE_LABELS[top]} (${String(max)} из 20 пар)`;
}
