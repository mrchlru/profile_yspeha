import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
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
} from "@/lib/audit/report/computeAuditMethodologyScores";
import { computeCfitTotals } from "@/lib/audit/report/computeCfitTotals";
import {
  MANAGER_BRIEF_ADAPTABILITY,
  MANAGER_BRIEF_CFIT_BY_IQ,
  MANAGER_BRIEF_CONFLICT,
  MANAGER_BRIEF_GOAL,
  MANAGER_BRIEF_KOS_COMM,
  MANAGER_BRIEF_KOS_ORG,
  MANAGER_BRIEF_MOTIVATION,
  MANAGER_BRIEF_RESPONSIBILITY,
  MANAGER_BRIEF_RISK,
  MANAGER_BRIEF_ROWE,
  MANAGER_BRIEF_STRESS,
  motivationPairKey,
} from "@/lib/audit/report/odReserveManagerBriefInterpretations";
import { buildPsychologicalStateFallbackConclusion } from "@/lib/audit/report/buildPsychologicalStateFallbackConclusion";
import { buildPsychologicalStateSignals } from "@/lib/audit/report/buildPsychologicalStateSignals";

const INSUFFICIENT = "Недостаточно данных для краткого вывода.";

/**
 * Текст пункта «Отчёт для руководителя» по справочнику заказчика (секции 1–11 батареи ОД/ТУ).
 * Секция 12 (Маслач MBI) — отдельная логика.
 */
export function resolveOdReserveManagerBriefText(
  sectionIndex: number,
  answers: AuditAnswersMap | undefined
): string | null {
  if (sectionIndex < 1 || sectionIndex > 11 || answers === undefined) {
    return null;
  }

  switch (sectionIndex) {
    case 1:
      return _briefCfit(answers);
    case 2:
      return _briefKos(answers);
    case 3:
      return _briefConflict(answers);
    case 4:
      return _briefMotivation(answers);
    case 5:
      return _briefPsychState(answers);
    case 6:
      return _briefRowe(answers);
    case 7:
      return _briefGoal(answers);
    case 8:
      return _briefRisk(answers);
    case 9:
      return _briefStress(answers);
    case 10:
      return _briefAdaptability(answers);
    case 11:
      return _briefResponsibility(answers);
    default:
      return null;
  }
}

function _briefCfit(answers: AuditAnswersMap): string {
  const totals = computeCfitTotals(answers);
  const iq = totals.iq;
  if (iq === null) {
    if (totals.correctTotal > 0 && totals.correctTotal < 21) {
      return MANAGER_BRIEF_CFIT_BY_IQ.below85;
    }
    return INSUFFICIENT;
  }
  if (iq < 85) {
    return MANAGER_BRIEF_CFIT_BY_IQ.below85;
  }
  if (iq <= 94) {
    return MANAGER_BRIEF_CFIT_BY_IQ.from85to94;
  }
  if (iq <= 105) {
    return MANAGER_BRIEF_CFIT_BY_IQ.from95to105;
  }
  return MANAGER_BRIEF_CFIT_BY_IQ.above105;
}

function _briefKos(answers: AuditAnswersMap): string {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "kos_communicative_organizational");
  const scores = computeKosScores(step ? answers[step.stepIndex] : undefined);
  if (scores.commLevel === null || scores.orgLevel === null) {
    return INSUFFICIENT;
  }
  const comm = MANAGER_BRIEF_KOS_COMM[scores.commLevel as 1 | 2 | 3 | 4 | 5];
  const org = MANAGER_BRIEF_KOS_ORG[scores.orgLevel as 1 | 2 | 3 | 4 | 5];
  return `${comm} ${org}`;
}

function _briefConflict(answers: AuditAnswersMap): string {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "thomas_kilmann_conflict");
  const scores = computeThomasKilmannScores(step ? answers[step.stepIndex] : undefined);
  if (scores.dominant === null) {
    return INSUFFICIENT;
  }
  return MANAGER_BRIEF_CONFLICT[scores.dominant];
}

function _briefMotivation(answers: AuditAnswersMap): string {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "gerchikov_motivation_full");
  const profile = computeGerchikovProfile(step ? answers[step.stepIndex] : undefined);
  const types = gerchikovDominantTypes(profile);
  if (types.length === 0) {
    return INSUFFICIENT;
  }
  const first = types[0];
  const second = types[1] ?? types[0];
  if (first === undefined) {
    return INSUFFICIENT;
  }
  const key = motivationPairKey(first, second);
  const direct = MANAGER_BRIEF_MOTIVATION[key];
  if (direct !== undefined) {
    return direct;
  }
  const reversed = motivationPairKey(second, first);
  return MANAGER_BRIEF_MOTIVATION[reversed] ?? INSUFFICIENT;
}

function _briefPsychState(answers: AuditAnswersMap): string {
  const signals = buildPsychologicalStateSignals(answers);
  if (signals.indicators.length === 0) {
    return INSUFFICIENT;
  }
  return buildPsychologicalStateFallbackConclusion(signals);
}

function _briefRowe(answers: AuditAnswersMap): string {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "rowe_decision_styles");
  const scores = computeRoweStyleScores(step ? answers[step.stepIndex] : undefined);
  if (scores.dominantStyle === null) {
    return INSUFFICIENT;
  }
  return MANAGER_BRIEF_ROWE[scores.dominantStyle];
}

function _briefGoal(answers: AuditAnswersMap): string {
  const scores = computeGoalPursuitScores(answers[2]);
  if (scores.sum === null) {
    return INSUFFICIENT;
  }
  if (scores.sum <= 16) {
    return MANAGER_BRIEF_GOAL.low;
  }
  if (scores.sum <= 23) {
    return MANAGER_BRIEF_GOAL.mid;
  }
  if (scores.sum <= 27) {
    return MANAGER_BRIEF_GOAL.high;
  }
  return MANAGER_BRIEF_GOAL.very_high;
}

function _briefRisk(answers: AuditAnswersMap): string {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "schubert_risk_full");
  const scores = computeSchubertScores(step ? answers[step.stepIndex] : undefined);
  if (scores.sum === null) {
    return INSUFFICIENT;
  }
  if (scores.sum < -30) {
    return MANAGER_BRIEF_RISK.low;
  }
  if (scores.sum <= 10) {
    return MANAGER_BRIEF_RISK.mid;
  }
  if (scores.sum <= 30) {
    return MANAGER_BRIEF_RISK.high;
  }
  return MANAGER_BRIEF_RISK.very_high;
}

function _briefStress(answers: AuditAnswersMap): string {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "type_a_jenkins_short");
  const scores = computeTypeAScores(step ? answers[step.stepIndex] : undefined);
  if (scores.sum === null) {
    return INSUFFICIENT;
  }
  if (scores.sum <= 10) {
    return MANAGER_BRIEF_STRESS.high;
  }
  if (scores.sum <= 19) {
    return MANAGER_BRIEF_STRESS.mid;
  }
  if (scores.sum <= 29) {
    return MANAGER_BRIEF_STRESS.low;
  }
  return MANAGER_BRIEF_STRESS.very_low;
}

function _briefAdaptability(answers: AuditAnswersMap): string {
  const scores = computeStrelyauScores(answers[7]);
  if (scores.diff === null || scores.level === null) {
    return INSUFFICIENT;
  }
  if (scores.diff >= 8) {
    return MANAGER_BRIEF_ADAPTABILITY.high;
  }
  if (scores.diff >= 5) {
    return MANAGER_BRIEF_ADAPTABILITY.mid;
  }
  if (scores.diff >= 3) {
    return MANAGER_BRIEF_ADAPTABILITY.below_mid;
  }
  return MANAGER_BRIEF_ADAPTABILITY.low;
}

function _briefResponsibility(answers: AuditAnswersMap): string {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "rotter_locus");
  const scores = computeRotterScores(step ? answers[step.stepIndex] : undefined);
  if (scores.internal === null || scores.external === null) {
    return INSUFFICIENT;
  }
  const diff = scores.internal - scores.external;
  if (diff >= 8) {
    return MANAGER_BRIEF_RESPONSIBILITY.very_high;
  }
  if (diff >= 2) {
    return MANAGER_BRIEF_RESPONSIBILITY.high;
  }
  if (diff >= -2) {
    return MANAGER_BRIEF_RESPONSIBILITY.mid;
  }
  return MANAGER_BRIEF_RESPONSIBILITY.low;
}
