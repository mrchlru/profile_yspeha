import type {
  AuditRiskLevel,
  AuditRiskProfile,
  AuditRiskScoreItem,
  CandidateScreeningNormalizedSignals,
} from "@/lib/ai/audit/auditAiTypes";
import { CANDIDATE_SCREENING_METHODOLOGY_WEIGHTS } from "@/lib/ai/audit/candidateScreeningMethodologyWeights";

/**
 * Risk engine для батареи скрининга кандидата.
 */
export function computeCandidateScreeningRiskEngine(
  signals: CandidateScreeningNormalizedSignals
): AuditRiskProfile {
  const items: AuditRiskScoreItem[] = [];
  _pushBurnoutRisks(signals, items);
  _pushMotivationRisk(signals, items);

  const burnoutRisk = _maxLevel(items.filter((item) => item.key.startsWith("burnout")));
  const retentionProbability = burnoutRisk;
  const conflictRisk = _conflictRisk(signals);
  const sabotageRisk = _combineLevels(retentionProbability, conflictRisk);
  const motivationLossRisk = _maxLevel(items.filter((item) => item.key === "motivation"));

  return {
    items,
    burnoutRisk,
    retentionProbability,
    conflictRisk,
    sabotageRisk,
    motivationLossRisk,
    organizationalFit: {
      startup: "neutral",
      corporate: burnoutRisk === "high" ? "poor" : "neutral",
      government: "neutral",
      remoteTeam: "neutral",
      projectEnvironment: "neutral",
    },
  };
}

function _pushBurnoutRisks(
  signals: CandidateScreeningNormalizedSignals,
  items: AuditRiskScoreItem[]
): void {
  const weight = CANDIDATE_SCREENING_METHODOLOGY_WEIGHTS.burnout ?? 10;
  if (signals.burnout.piBand !== null) {
    items.push({
      key: "burnout_exhaustion",
      label: "Психоэмоциональное истощение (ПИ)",
      level: _bandToRisk(signals.burnout.piBand),
      score: _levelScore(_bandToRisk(signals.burnout.piBand)) * weight,
      weight,
      evidence: `ПИ band=${signals.burnout.piBand}`,
    });
  }
}

function _pushMotivationRisk(
  signals: CandidateScreeningNormalizedSignals,
  items: AuditRiskScoreItem[]
): void {
  if (!signals.motivation.complete) {
    return;
  }
  const weight = CANDIDATE_SCREENING_METHODOLOGY_WEIGHTS.motivation ?? 8;
  items.push({
    key: "motivation",
    label: "Тип мотивации",
    level: "low",
    score: 2 * weight,
    weight,
    evidence: signals.motivation.leadingTypes.join(", ") || "не определён",
  });
}

function _conflictRisk(signals: CandidateScreeningNormalizedSignals): AuditRiskLevel {
  if (signals.conflictStyle.dominant === null) {
    return "medium";
  }
  const dominant = signals.conflictStyle.dominant.toLowerCase();
  if (dominant.includes("сопернич") || dominant.includes("compet")) {
    return "high";
  }
  if (dominant.includes("избег")) {
    return "medium";
  }
  return "low";
}

function _bandToRisk(band: string): AuditRiskLevel {
  if (band === "high" || band === "very_high") {
    return "high";
  }
  if (band === "medium" || band === "mid") {
    return "medium";
  }
  return "low";
}

function _levelScore(level: AuditRiskLevel): number {
  if (level === "high") {
    return 3;
  }
  if (level === "medium") {
    return 2;
  }
  return 1;
}

function _maxLevel(items: AuditRiskScoreItem[]): AuditRiskLevel {
  if (items.some((item) => item.level === "high")) {
    return "high";
  }
  if (items.some((item) => item.level === "medium")) {
    return "medium";
  }
  return "low";
}

function _combineLevels(a: AuditRiskLevel, b: AuditRiskLevel): AuditRiskLevel {
  return _maxLevel([
    { key: "a", label: "", level: a, score: 0, weight: 0, evidence: "" },
    { key: "b", label: "", level: b, score: 0, weight: 0, evidence: "" },
  ]);
}
