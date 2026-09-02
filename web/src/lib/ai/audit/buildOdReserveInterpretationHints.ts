import type {
  AuditInterpretationHint,
  AuditNormalizedSignals,
  OdReserveNormalizedSignals,
} from "@/lib/ai/audit/auditAiTypes";
import { buildInterpretationHints } from "@/lib/ai/audit/auditInterpretationCatalog";

/**
 * Подсказки интерпретации только по 12 методикам батареи ОД.
 */
export function buildOdReserveInterpretationHints(
  signals: OdReserveNormalizedSignals
): ReadonlyArray<AuditInterpretationHint> {
  const bridge: AuditNormalizedSignals = {
    decisionStyle: signals.decisionStyle,
    goalPursuit: signals.goalPursuit,
    paperwork: { groupScores: {}, profiles: [], complete: false },
    selfMonitoring: { score: null, level: null, complete: false },
    riskReadiness: signals.riskReadiness,
    stressType: signals.stressType,
    adaptability: signals.adaptability,
    locusOfControl: signals.locusOfControl,
    tolerance: { tn: null, itn1: null, mitn: null, complete: false },
    cfit: signals.cfit,
    keirsey: { typeCode: null, temperament: null, complete: false },
    burnout: signals.burnout,
    conflictStyle: signals.conflictStyle,
    motivation: signals.motivation,
    loyalty: { sum: null, level: null, complete: false },
    communication: signals.communication,
    erudition: { scaledScore: null, grade: null, complete: false },
  };

  const hints = buildInterpretationHints(bridge);

  if (signals.maslachMbi.complete && signals.maslachMbi.classicBurnout) {
    return [
      ...hints,
      {
        signalKey: "maslachMbi",
        levelKey: "classic_burnout",
        meaning: ["classic burnout pattern on MBI scales", "high EE and DP with reduced PA"],
        managementRisk: "critical",
        adaptationFocus: ["reduce workload", "restore meaning", "schedule recovery"],
      },
    ];
  }

  return hints;
}
