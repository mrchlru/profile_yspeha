import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import type { CandidateScreeningNormalizedSignals } from "@/lib/ai/audit/auditAiTypes";
import { computeCfitTotals } from "@/lib/audit/report/computeCfitTotals";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import { computeSectarianismEvaluation } from "@/lib/audit/report/computeSectarianismScores";import {
  computeGerchikovProfile,
  computeThomasKilmannScores,
  gerchikovDominantTypes,
  gerchikovTypeLabel,
  thomasKilmannStyleLabel,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import type { GerchikovMotivationType } from "@/lib/audit/report/keys/auditScoringKeys";

/**
 * Нормализует ответы батареи скрининга кандидата.
 */export function extractCandidateScreeningAuditSignals(
  answers: AuditAnswersMap
): CandidateScreeningNormalizedSignals {
  const cfit = computeCfitTotals(answers);
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnout = computeBurnoutScores(burnoutStep ? answers[burnoutStep.stepIndex] : undefined);
  const thomas = computeThomasKilmannScores(answers[20]);
  const gerchikov = computeGerchikovProfile(answers[21]);
  const sectarianStep = AUDIT_STEPS.find((s) => s.internalKey === "sectarianism_screening");
  const sectarian = computeSectarianismEvaluation(
    sectarianStep ? answers[sectarianStep.stepIndex] : undefined
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
    conflictStyle: {
      dominant: thomasKilmannStyleLabel(thomas.dominant),
      complete: thomas.answered >= thomas.totalPairs,
    },
    motivation: {
      leadingTypes: gerchikovLeading.map((type) => gerchikovTypeLabel(type)),
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
    sectarianism: {
      answeredCount: sectarian.answeredCount,
      totalCount: sectarian.totalCount,
      complete: sectarian.complete,
      anyDetected: sectarian.anyDetected,
      detectedProfileNames: sectarian.detectedProfiles.map((item) => item.displayName),
      profileScores: sectarian.profileScores.map((item) => ({
        profileId: item.profileId,
        displayName: item.displayName,
        scorePercent: item.scorePercent,
        detected: item.detected,
      })),
    },
  };
}

function _gerchikovStimulationHint(leading: GerchikovMotivationType[]): string | null {
  if (leading.length === 0) {
    return null;
  }
  return leading.map((type) => gerchikovTypeLabel(type)).join(", ");
}
