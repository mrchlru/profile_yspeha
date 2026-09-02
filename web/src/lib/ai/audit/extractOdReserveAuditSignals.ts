import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import type { OdReserveNormalizedSignals } from "@/lib/ai/audit/auditAiTypes";
import { computeMaslachMbiFromAuditStep } from "@/lib/audit/report/computeMaslachMbiFromAuditStep";
import { computeCfitTotals } from "@/lib/audit/report/computeCfitTotals";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import {
  computeGerchikovProfile,
  computeGoalPursuitScores,
  computeKosScores,
  computeRotterScores,
  computeRoweStyleScores,
  computeSchubertScores,
  computeStrelyauScores,
  computeThomasKilmannScores,
  computeTypeAScores,
  gerchikovDominantTypes,
  gerchikovTypeLabel,
  thomasKilmannStyleLabel,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import type { GerchikovMotivationType } from "@/lib/audit/report/keys/auditScoringKeys";

/**
 * Нормализует ответы батареи ОД в сигналы только по 12 методикам (без Кейрси, лояльности и др.).
 */
export function extractOdReserveAuditSignals(
  answers: AuditAnswersMap
): OdReserveNormalizedSignals {
  const rowe = computeRoweStyleScores(answers[1]);
  const goal = computeGoalPursuitScores(answers[2]);
  const schubert = computeSchubertScores(answers[5]);
  const typeA = computeTypeAScores(answers[6]);
  const strelyau = computeStrelyauScores(answers[7]);
  const rotter = computeRotterScores(answers[8]);
  const cfit = computeCfitTotals(answers);
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnout = computeBurnoutScores(burnoutStep ? answers[burnoutStep.stepIndex] : undefined);
  const thomas = computeThomasKilmannScores(answers[20]);
  const gerchikov = computeGerchikovProfile(answers[21]);
  const kos = computeKosScores(answers[23]);
  const maslachStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_mbi_short");
  const maslach = computeMaslachMbiFromAuditStep(
    maslachStep ? answers[maslachStep.stepIndex] : undefined
  );

  const gerchikovLeading = gerchikovDominantTypes(gerchikov);

  return {
    cfit: {
      rawScore: cfit.correctTotal,
      iqLookupRaw: cfit.iqLookupRaw,
      iq: cfit.iq,
      answered: cfit.answeredTotal,
      scorable: cfit.scorableTotal,
      complete: cfit.answeredTotal >= cfit.scorableTotal && cfit.scorableTotal > 0,
    },
    communication: {
      commLevel: kos.commLevel,
      orgLevel: kos.orgLevel,
      commK: kos.commK,
      orgK: kos.orgK,
      complete: kos.answered >= 40,
    },
    conflictStyle: {
      dominant: thomasKilmannStyleLabel(thomas.dominant),
      complete: thomas.answered >= thomas.totalPairs,
    },
    motivation: {
      leadingTypes: gerchikovLeading.map((t) => gerchikovTypeLabel(t)),
      stimulationSummary: _gerchikovStimulationHint(gerchikovLeading),
      complete: gerchikov.answerSlots > 0,
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
    maslachMbi: {
      ee: maslach.scores.ee,
      dp: maslach.scores.dp,
      pa: maslach.scores.pa,
      classicBurnout:
        maslach.interpretation !== null ? maslach.interpretation.classicBurnout : false,
      eeLevel: maslach.interpretation?.ee.levelLabel ?? null,
      dpLevel: maslach.interpretation?.dp.levelLabel ?? null,
      paLevel: maslach.interpretation?.pa.levelLabel ?? null,
      complete:
        maslach.scores.ee !== null &&
        maslach.scores.dp !== null &&
        maslach.scores.pa !== null,
    },
  };
}

function _gerchikovStimulationHint(leading: GerchikovMotivationType[]): string | null {
  if (leading.length === 0) {
    return null;
  }
  return leading.map((t) => gerchikovTypeLabel(t)).join(", ");
}
