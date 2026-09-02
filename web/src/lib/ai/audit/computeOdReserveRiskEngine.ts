import type {
  AuditRiskLevel,
  AuditRiskProfile,
  AuditRiskScoreItem,
  OdReserveNormalizedSignals,
} from "@/lib/ai/audit/auditAiTypes";
import { OD_RESERVE_METHODOLOGY_WEIGHTS } from "@/lib/ai/audit/odReserveMethodologyWeights";

/**
 * Risk engine для батареи ОД: только 12 методик, без лояльности и прочих блоков полного аудита.
 */
export function computeOdReserveRiskEngine(
  signals: OdReserveNormalizedSignals
): AuditRiskProfile {
  const items: AuditRiskScoreItem[] = [];

  _pushBurnoutRisks(signals, items);
  _pushMaslachMbiRisk(signals, items);
  _pushCommunicationRisk(signals, items);
  _pushMotivationRisk(signals, items);
  _pushAdaptabilityRisk(signals, items);
  _pushGoalRisk(signals, items);
  _pushLocusRisk(signals, items);

  const burnoutRisk = _maxLevel(
    items.filter((i) => i.key.startsWith("burnout") || i.key.startsWith("maslach"))
  );
  const retentionProbability = burnoutRisk;
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
    organizationalFit: _organizationalFit(signals, burnoutRisk),
  };
}

function _pushBurnoutRisks(
  signals: OdReserveNormalizedSignals,
  items: AuditRiskScoreItem[]
): void {
  const weight = OD_RESERVE_METHODOLOGY_WEIGHTS.burnout ?? 10;
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

function _pushMaslachMbiRisk(
  signals: OdReserveNormalizedSignals,
  items: AuditRiskScoreItem[]
): void {
  const weight = OD_RESERVE_METHODOLOGY_WEIGHTS.maslachMbi ?? 10;
  if (!signals.maslachMbi.complete) {
    return;
  }
  const level: AuditRiskLevel = signals.maslachMbi.classicBurnout
    ? "critical"
    : signals.maslachMbi.ee !== null && signals.maslachMbi.ee >= 25
      ? "high"
      : "medium";
  items.push({
    key: "maslach_mbi",
    label: "Выгорание MBI (Маслач)",
    level,
    score: _levelScore(level) * weight,
    weight,
    evidence: `EE=${String(signals.maslachMbi.ee)}, DP=${String(signals.maslachMbi.dp)}, PA=${String(signals.maslachMbi.pa)}`,
  });
}

function _pushCommunicationRisk(
  signals: OdReserveNormalizedSignals,
  items: AuditRiskScoreItem[]
): void {
  const weight = OD_RESERVE_METHODOLOGY_WEIGHTS.communication ?? 9;
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
    evidence: `commLevel=${String(signals.communication.commLevel)}`,
  });
}

function _pushMotivationRisk(
  signals: OdReserveNormalizedSignals,
  items: AuditRiskScoreItem[]
): void {
  const weight = OD_RESERVE_METHODOLOGY_WEIGHTS.motivation ?? 9;
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

function _pushAdaptabilityRisk(
  signals: OdReserveNormalizedSignals,
  items: AuditRiskScoreItem[]
): void {
  const weight = OD_RESERVE_METHODOLOGY_WEIGHTS.adaptability ?? 8;
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

function _pushGoalRisk(signals: OdReserveNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = OD_RESERVE_METHODOLOGY_WEIGHTS.goalPursuit ?? 7;
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

function _pushLocusRisk(signals: OdReserveNormalizedSignals, items: AuditRiskScoreItem[]): void {
  const weight = OD_RESERVE_METHODOLOGY_WEIGHTS.locusOfControl ?? 8;
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
  signals: OdReserveNormalizedSignals,
  burnout: AuditRiskLevel
): AuditRiskProfile["organizationalFit"] {
  const lowComm = signals.communication.commLevel !== null && signals.communication.commLevel <= 2;
  const highAutonomy =
    signals.locusOfControl.orientation === "internal" && signals.goalPursuit.level !== "low";

  return {
    startup: highAutonomy && burnout !== "critical" ? "good" : burnout === "critical" ? "poor" : "neutral",
    corporate: burnout === "high" || burnout === "critical" ? "poor" : "neutral",
    government: lowComm || burnout === "high" ? "poor" : "neutral",
    remoteTeam: lowComm ? "good" : "neutral",
    projectEnvironment: highAutonomy ? "good" : "neutral",
  };
}

function _conflictRisk(signals: OdReserveNormalizedSignals): AuditRiskLevel {
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
