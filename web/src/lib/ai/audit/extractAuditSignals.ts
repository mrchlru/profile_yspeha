import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import type { AuditNormalizedSignals } from "@/lib/ai/audit/auditAiTypes";
import { computeCfitTotals } from "@/lib/audit/report/computeCfitTotals";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import {
  computeEruditionScores,
  computeGerchikovProfile,
  computeGoalPursuitScores,
  computeKeirseyScores,
  computeKosScores,
  computePaperworkScores,
  computePochebutScores,
  computeRotterScores,
  computeRoweStyleScores,
  computeSchubertScores,
  computeSnyderScores,
  computeStrelyauScores,
  computeThomasKilmannScores,
  computeToleranceScores,
  computeTypeAScores,
  gerchikovDominantTypes,
  gerchikovTypeLabel,
  keirseyTemperamentLabel,
  keirseyTypeLabel,
  thomasKilmannStyleLabel,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import type { GerchikovMotivationType } from "@/lib/audit/report/keys/auditScoringKeys";

/**
 * Нормализует ответы аудита в компактный JSON сигналов для risk engine и LLM.
 */
export function extractAuditSignals(answers: AuditAnswersMap): AuditNormalizedSignals {
  const rowe = computeRoweStyleScores(answers[1]);
  const goal = computeGoalPursuitScores(answers[2]);
  const paperwork = computePaperworkScores(answers[3]);
  const snyder = computeSnyderScores(answers[4]);
  const schubert = computeSchubertScores(answers[5]);
  const typeA = computeTypeAScores(answers[6]);
  const strelyau = computeStrelyauScores(answers[7]);
  const rotter = computeRotterScores(answers[8]);
  const tolerance = computeToleranceScores(answers[9]);
  const cfit = computeCfitTotals(answers);
  const keirsey = computeKeirseyScores(answers[18]);
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnout = computeBurnoutScores(burnoutStep ? answers[burnoutStep.stepIndex] : undefined);
  const thomas = computeThomasKilmannScores(answers[20]);
  const gerchikov = computeGerchikovProfile(answers[21]);
  const pochebut = computePochebutScores(answers[22]);
  const kos = computeKosScores(answers[23]);
  const erudition = computeEruditionScores(answers[24]);

  const gerchikovLeading = gerchikovDominantTypes(gerchikov);
  const gerchikovStimulation = _gerchikovStimulationHint(gerchikovLeading);

  return {
    decisionStyle: {
      pairsAnswered: rowe.pairsAnswered,
      styleCounts: {
        action: rowe.styleCounts[1],
        process: rowe.styleCounts[2],
        people: rowe.styleCounts[3],
        future: rowe.styleCounts[4],
      },
      dominantStyles: [...rowe.dominantStyles],
      complete: rowe.pairsAnswered >= rowe.pairsTotal,
    },
    goalPursuit: {
      sum: goal.sum,
      level: goal.level,
      complete: goal.answered >= 10,
    },
    paperwork: {
      groupScores: {
        g1: paperwork.groupScores[1],
        g2: paperwork.groupScores[2],
        g3: paperwork.groupScores[3],
        g4: paperwork.groupScores[4],
      },
      profiles: paperwork.profiles,
      complete: paperwork.answered >= 12,
    },
    selfMonitoring: {
      score: snyder.score,
      level: snyder.level,
      complete: snyder.answered >= 25,
    },
    riskReadiness: {
      sum: schubert.sum,
      level: schubert.level,
      complete: schubert.answered >= 25,
    },
    stressType: {
      sum: typeA.sum,
      profile: typeA.profile,
      complete: typeA.answered >= 20,
    },
    adaptability: {
      diff: strelyau.diff,
      level: strelyau.bandLabel ?? strelyau.level,
      complete: strelyau.answered >= 15,
    },
    locusOfControl: {
      external: rotter.external,
      internal: rotter.internal,
      orientation: rotter.orientation,
      complete: rotter.answered >= 23,
    },
    tolerance: {
      tn: tolerance.tn,
      itn1: tolerance.itn1,
      mitn: tolerance.mitn,
      complete: tolerance.answered >= 33,
    },
    cfit: {
      rawScore: cfit.correctTotal,
      iqLookupRaw: cfit.iqLookupRaw,
      iq: cfit.iq,
      answered: cfit.answeredTotal,
      scorable: cfit.scorableTotal,
      complete: cfit.answeredTotal >= cfit.scorableTotal && cfit.scorableTotal > 0,
    },
    keirsey: {
      typeCode: keirsey.typeCode !== null ? keirseyTypeLabel(keirsey.typeCode) : null,
      temperament:
        keirsey.temperament !== null ? keirseyTemperamentLabel(keirsey.temperament) : null,
      complete: keirsey.pairsAnswered >= keirsey.pairsTotal,
    },
    burnout: {
      pi: burnout.pi,
      lo: burnout.lo,
      pm: burnout.pm,
      ipv: burnout.ipv,
      workerLoad: burnout.workerLoad,
      piBand: burnout.piBand,
      loBand: burnout.loBand,
      complete: burnout.answeredCount >= burnout.totalItems,
    },
    conflictStyle: {
      dominant: thomasKilmannStyleLabel(thomas.dominant),
      complete: thomas.answered >= thomas.totalPairs,
    },
    motivation: {
      leadingTypes: gerchikovLeading.map((t) => gerchikovTypeLabel(t)),
      stimulationSummary: gerchikovStimulation,
      complete: gerchikov.answerSlots > 0,
    },
    loyalty: {
      sum: pochebut.sum,
      level: pochebut.level,
      complete: pochebut.answered >= 18,
    },
    communication: {
      commLevel: kos.commLevel,
      orgLevel: kos.orgLevel,
      commK: kos.commK,
      orgK: kos.orgK,
      complete: kos.answered >= 40,
    },
    erudition: {
      scaledScore: erudition.scaledScore,
      grade: erudition.grade,
      complete: erudition.isComplete,
    },
  };
}

function _gerchikovStimulationHint(leading: GerchikovMotivationType[]): string | null {
  if (leading.length === 0) {
    return null;
  }
  return leading.map((t) => gerchikovTypeLabel(t)).join(", ");
}
