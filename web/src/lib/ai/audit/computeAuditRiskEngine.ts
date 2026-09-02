import type {
  AuditNormalizedSignals,
  AuditOrganizationalFitLevel,
  AuditRiskLevel,
  AuditRiskProfile,
  AuditRiskScoreItem,
} from "@/lib/ai/audit/auditAiTypes";
import { AUDIT_METHODOLOGY_WEIGHTS } from "@/lib/ai/audit/auditMethodologyWeights";

/**
 * Детерминированный risk engine: взвешенные риски и организационный fit.
 */
export function computeAuditRiskEngine(signals: AuditNormalizedSignals): AuditRiskProfile {
  const items: AuditRiskScoreItem[] = [];

  _pushBurnoutRisks(signals, items);
  _pushLoyaltyRisk(signals, items);
  _pushCommunicationRisk(signals, items);
  _pushMotivationRisk(signals, items);
  _pushAdaptabilityRisk(signals, items);
  _pushGoalRisk(signals, items);
  _pushLocusRisk(signals, items);

  const burnoutRisk = _maxLevel(items.filter((i) => i.key.startsWith("burnout")));
  const retentionProbability = _maxLevel(
    items.filter((i) => i.key === "loyalty" || i.key.startsWith("burnout"))
  );
  const conflictRisk = _conflictRisk(signals);
  const sabotageRisk = _combineLevels(retentionProbability, conflictRisk);
  const motivationLossRisk = _maxLevel(
    items.filter((i) => i.key === "goalPursuit" || i.key === "motivation")
  );

  return {
    items,
    burnoutRisk,
    retentionProbability,
    conflictRisk,
    sabotageRisk,
    motivationLossRisk,
    organizationalFit: _organizationalFit(signals, burnoutRisk, retentionProbability),
  };
}

/** Преобразует fit-уровни в подписи для промпта. */
export function formatOrganizationalFitForPrompt(
  fit: AuditRiskProfile["organizationalFit"]
): Record<string, string> {
  return {
    startup: _fitLabel(fit.startup),
    corporate: _fitLabel(fit.corporate),
    government: _fitLabel(fit.government),
    remoteTeam: _fitLabel(fit.remoteTeam),
    projectEnvironment: _fitLabel(fit.projectEnvironment),
  };
}

function _pushBurnoutRisks(signals: AuditNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = AUDIT_METHODOLOGY_WEIGHTS.burnout ?? 10;
  if (signals.burnout.lo !== null && signals.burnout.loBand !== null) {
    items.push({
      key: "burnout_detachment",
      label: "Эмоциональное отчуждение (ЛО)",
      level: _bandToRisk(signals.burnout.loBand),
      score: _levelScore(_bandToRisk(signals.burnout.loBand)) * weight,
      weight,
      evidence: `ЛО=${String(signals.burnout.lo)}, band=${signals.burnout.loBand}`,
    });
  }
  if (signals.burnout.pi !== null && signals.burnout.piBand !== null) {
    items.push({
      key: "burnout_exhaustion",
      label: "Эмоциональное истощение (ПИ)",
      level: _bandToRisk(signals.burnout.piBand),
      score: _levelScore(_bandToRisk(signals.burnout.piBand)) * weight,
      weight,
      evidence: `ПИ=${String(signals.burnout.pi)}, band=${signals.burnout.piBand}`,
    });
  }
}

function _pushLoyaltyRisk(signals: AuditNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = AUDIT_METHODOLOGY_WEIGHTS.loyalty ?? 10;
  if (signals.loyalty.level === null) {
    return;
  }
  const level = _loyaltyToRisk(signals.loyalty.level);
  items.push({
    key: "loyalty",
    label: "Лояльность организации",
    level,
    score: _levelScore(level) * weight,
    weight,
    evidence: `sum=${String(signals.loyalty.sum ?? "—")}, level=${signals.loyalty.level}`,
  });
}

function _pushCommunicationRisk(signals: AuditNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = AUDIT_METHODOLOGY_WEIGHTS.communication ?? 9;
  if (signals.communication.commLevel === null) {
    return;
  }
  const level =
    signals.communication.commLevel <= 2
      ? "high"
      : signals.communication.commLevel === 3
        ? "medium"
        : "low";
  items.push({
    key: "communication",
    label: "Коммуникативные способности",
    level,
    score: _levelScore(level) * weight,
    weight,
    evidence: `commLevel=${String(signals.communication.commLevel)}, K=${String(signals.communication.commK ?? "—")}`,
  });
}

function _pushMotivationRisk(signals: AuditNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = AUDIT_METHODOLOGY_WEIGHTS.motivation ?? 9;
  if (signals.motivation.leadingTypes.length === 0) {
    return;
  }
  items.push({
    key: "motivation",
    label: "Мотивационный профиль",
    level: "medium",
    score: 45 * weight,
    weight,
    evidence: `leading=${signals.motivation.leadingTypes.join(", ")}`,
  });
}

function _pushAdaptabilityRisk(signals: AuditNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = AUDIT_METHODOLOGY_WEIGHTS.adaptability ?? 8;
  if (signals.adaptability.diff === null) {
    return;
  }
  const level =
    signals.adaptability.diff <= 2 ? "high" : signals.adaptability.diff <= 5 ? "medium" : "low";
  items.push({
    key: "adaptability",
    label: "Психологическая адаптивность",
    level,
    score: _levelScore(level) * weight,
    weight,
    evidence: `flexibility=${String(signals.adaptability.diff)}`,
  });
}

function _pushGoalRisk(signals: AuditNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = AUDIT_METHODOLOGY_WEIGHTS.goalPursuit ?? 7;
  if (signals.goalPursuit.level === null) {
    return;
  }
  const level =
    signals.goalPursuit.level === "low"
      ? "high"
      : signals.goalPursuit.level === "high"
        ? "low"
        : "medium";
  items.push({
    key: "goalPursuit",
    label: "Целеустремлённость",
    level,
    score: _levelScore(level) * weight,
    weight,
    evidence: `sum=${String(signals.goalPursuit.sum ?? "—")}, level=${signals.goalPursuit.level}`,
  });
}

function _pushLocusRisk(signals: AuditNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = AUDIT_METHODOLOGY_WEIGHTS.locusOfControl ?? 8;
  if (signals.locusOfControl.orientation === null) {
    return;
  }
  items.push({
    key: "locusOfControl",
    label: "Локус контроля",
    level: "low",
    score: 20 * weight,
    weight,
    evidence: `orientation=${signals.locusOfControl.orientation}`,
  });
}

function _organizationalFit(
  signals: AuditNormalizedSignals,
  burnout: AuditRiskLevel,
  retention: AuditRiskLevel
): AuditRiskProfile["organizationalFit"] {
  const bureaucraticPenalty =
    retention === "critical" || retention === "high" || signals.loyalty.level === "very_low";
  const lowComm = signals.communication.commLevel !== null && signals.communication.commLevel <= 2;
  const highAutonomy =
    signals.locusOfControl.orientation === "internal" && signals.goalPursuit.level !== "low";

  return {
    startup: highAutonomy && burnout !== "critical" ? "good" : burnout === "critical" ? "poor" : "neutral",
    corporate: bureaucraticPenalty ? "poor" : burnout === "high" ? "poor" : "neutral",
    government: bureaucraticPenalty || lowComm ? "poor" : "neutral",
    remoteTeam: lowComm ? "good" : "neutral",
    projectEnvironment: highAutonomy ? "good" : "neutral",
  };
}

function _conflictRisk(signals: AuditNormalizedSignals): AuditRiskLevel {
  if (signals.conflictStyle.dominant === null) {
    return "medium";
  }
  const d = signals.conflictStyle.dominant.toLowerCase();
  if (d.includes("сопернич") || d.includes("compet")) {
    return "high";
  }
  if (d.includes("избег")) {
    return "medium";
  }
  return "low";
}

function _loyaltyToRisk(level: string): AuditRiskLevel {
  if (level === "very_low") {
    return "critical";
  }
  if (level === "low") {
    return "high";
  }
  if (level === "mid") {
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
  switch (level) {
    case "critical":
      return 100;
    case "high":
      return 75;
    case "medium":
      return 45;
    case "low":
      return 15;
  }
}

function _maxLevel(items: ReadonlyArray<AuditRiskScoreItem>): AuditRiskLevel {
  if (items.length === 0) {
    return "medium";
  }
  const order: AuditRiskLevel[] = ["low", "medium", "high", "critical"];
  let max = 0;
  for (const item of items) {
    max = Math.max(max, order.indexOf(item.level));
  }
  return order[max] ?? "medium";
}

function _combineLevels(a: AuditRiskLevel, b: AuditRiskLevel): AuditRiskLevel {
  return _maxLevel([
    { key: "a", label: "", level: a, score: 0, weight: 0, evidence: "" },
    { key: "b", label: "", level: b, score: 0, weight: 0, evidence: "" },
  ]);
}

function _fitLabel(level: AuditOrganizationalFitLevel): string {
  switch (level) {
    case "good":
      return "подходит";
    case "poor":
      return "не подходит";
    default:
      return "нейтрально";
  }
}
