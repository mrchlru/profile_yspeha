import type {
  AuditInterpretationHint,
  AuditNormalizedSignals,
  CandidateScreeningNormalizedSignals,
} from "@/lib/ai/audit/auditAiTypes";
import { buildInterpretationHints } from "@/lib/ai/audit/auditInterpretationCatalog";

/**
 * Подсказки интерпретации по методикам батареи скрининга кандидата.
 */
export function buildCandidateScreeningInterpretationHints(
  signals: CandidateScreeningNormalizedSignals
): ReadonlyArray<AuditInterpretationHint> {
  const bridge: AuditNormalizedSignals = {
    decisionStyle: {
      pairsAnswered: 0,
      styleCounts: {},
      dominantStyles: [],
      complete: false,
    },
    goalPursuit: { sum: null, level: null, complete: false },
    paperwork: { groupScores: {}, profiles: [], complete: false },
    selfMonitoring: { score: null, level: null, complete: false },
    riskReadiness: { sum: null, level: null, complete: false },
    stressType: { sum: null, profile: null, complete: false },
    adaptability: { diff: null, level: null, complete: false },
    locusOfControl: {
      external: null,
      internal: null,
      orientation: null,
      complete: false,
    },
    tolerance: { tn: null, itn1: null, mitn: null, complete: false },
    cfit: signals.cfit,
    keirsey: { typeCode: null, temperament: null, complete: false },
    burnout: signals.burnout,
    conflictStyle: signals.conflictStyle,
    motivation: signals.motivation,
    loyalty: { sum: null, level: null, complete: false },
    communication: {
      commLevel: null,
      orgLevel: null,
      commK: null,
      orgK: null,
      complete: false,
    },
    erudition: { scaledScore: null, grade: null, complete: false },
  };

  return buildInterpretationHints(bridge);
}
