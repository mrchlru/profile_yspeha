import type { AuditInterpretationHint, AuditNormalizedSignals, AuditRiskLevel } from "@/lib/ai/audit/auditAiTypes";

type CatalogEntry = {
  meaning: ReadonlyArray<string>;
  managementRisk: AuditRiskLevel;
  adaptationFocus: ReadonlyArray<string>;
};

const LOYALTY_CATALOG: Record<string, CatalogEntry> = {
  very_low: {
    meaning: [
      "high resignation risk",
      "low emotional attachment to organization",
      "possible passive resistance",
    ],
    managementRisk: "critical",
    adaptationFocus: ["restore trust", "increase autonomy", "reduce bureaucracy"],
  },
  low: {
    meaning: ["weak organizational attachment", "skepticism toward corporate narratives"],
    managementRisk: "high",
    adaptationFocus: ["transparent expectations", "clear value exchange", "direct feedback"],
  },
  mid: {
    meaning: ["moderate loyalty", "conditional engagement"],
    managementRisk: "medium",
    adaptationFocus: ["clarify career path", "align tasks with interests"],
  },
  high: {
    meaning: ["strong organizational attachment", "team identification"],
    managementRisk: "low",
    adaptationFocus: ["recognition", "development opportunities"],
  },
};

const BURNOUT_BAND_CATALOG: Record<string, CatalogEntry> = {
  high: {
    meaning: ["emotional exhaustion", "detachment risk", "motivation erosion"],
    managementRisk: "critical",
    adaptationFocus: ["reduce load", "restore meaning", "protect recovery time"],
  },
  medium: {
    meaning: ["elevated strain", "needs monitoring"],
    managementRisk: "high",
    adaptationFocus: ["workload review", "support resources"],
  },
  low: {
    meaning: ["resource reserve present"],
    managementRisk: "low",
    adaptationFocus: ["maintain sustainable pace"],
  },
};

const GOAL_CATALOG: Record<string, CatalogEntry> = {
  low: {
    meaning: ["weak achievement drive without intrinsic interest", "KPI-only motivation fails quickly"],
    managementRisk: "high",
    adaptationFocus: ["assign meaningful challenges", "link tasks to personal interest"],
  },
  mid: {
    meaning: ["moderate goal pursuit"],
    managementRisk: "medium",
    adaptationFocus: ["clear milestones", "visible progress"],
  },
  high: {
    meaning: ["strong goal orientation"],
    managementRisk: "low",
    adaptationFocus: ["ambitious targets", "ownership"],
  },
};

const COMM_CATALOG: Record<string, CatalogEntry> = {
  "1": {
    meaning: ["low communicative capacity", "social energy drain in groups"],
    managementRisk: "high",
    adaptationFocus: ["async communication", "small teams", "written briefs"],
  },
  "2": {
    meaning: ["below-average communication skills"],
    managementRisk: "medium",
    adaptationFocus: ["coaching on communication", "paired work"],
  },
  "3": {
    meaning: ["average communication"],
    managementRisk: "medium",
    adaptationFocus: ["balanced team roles"],
  },
  "4": {
    meaning: ["strong communicator"],
    managementRisk: "low",
    adaptationFocus: ["client-facing roles if aligned"],
  },
  "5": {
    meaning: ["very high communication capacity"],
    managementRisk: "low",
    adaptationFocus: ["facilitation roles"],
  },
};

/**
 * Строит карту интерпретаций для LLM (стандартизация, без импровизации каждый раз).
 */
export function buildInterpretationHints(
  signals: AuditNormalizedSignals
): ReadonlyArray<AuditInterpretationHint> {
  const hints: AuditInterpretationHint[] = [];

  if (signals.loyalty.level !== null) {
    const entry = LOYALTY_CATALOG[signals.loyalty.level];
    if (entry !== undefined) {
      hints.push({ signalKey: "loyalty", levelKey: signals.loyalty.level, ...entry });
    }
  }

  if (signals.burnout.loBand !== null) {
    const bandKey = _burnoutBandKey(signals.burnout.loBand);
    const entry = BURNOUT_BAND_CATALOG[bandKey];
    if (entry !== undefined) {
      hints.push({ signalKey: "burnout_detachment", levelKey: bandKey, ...entry });
    }
  }

  if (signals.burnout.piBand !== null) {
    const bandKey = _burnoutBandKey(signals.burnout.piBand);
    const entry = BURNOUT_BAND_CATALOG[bandKey];
    if (entry !== undefined) {
      hints.push({ signalKey: "burnout_exhaustion", levelKey: bandKey, ...entry });
    }
  }

  if (signals.goalPursuit.level !== null) {
    const entry = GOAL_CATALOG[signals.goalPursuit.level];
    if (entry !== undefined) {
      hints.push({ signalKey: "goalPursuit", levelKey: signals.goalPursuit.level, ...entry });
    }
  }

  if (signals.communication.commLevel !== null) {
    const key = String(signals.communication.commLevel);
    const entry = COMM_CATALOG[key];
    if (entry !== undefined) {
      hints.push({ signalKey: "communication", levelKey: key, ...entry });
    }
  }

  if (signals.locusOfControl.orientation === "internal") {
    hints.push({
      signalKey: "locusOfControl",
      levelKey: "internal",
      meaning: ["takes responsibility", "autonomous operator", "dislikes blame shifting"],
      managementRisk: "low",
      adaptationFocus: ["grant ownership", "minimize micromanagement"],
    });
  } else if (signals.locusOfControl.orientation === "external") {
    hints.push({
      signalKey: "locusOfControl",
      levelKey: "external",
      meaning: ["attributes outcomes to environment", "needs clear structure"],
      managementRisk: "medium",
      adaptationFocus: ["explicit accountability", "structured feedback loops"],
    });
  }

  return hints;
}

function _burnoutBandKey(band: string): string {
  if (band === "high" || band === "very_high") {
    return "high";
  }
  if (band === "medium" || band === "mid") {
    return "medium";
  }
  return "low";
}
