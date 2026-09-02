import type { AuditAiPipelinePayload } from "@/lib/ai/audit/auditAiTypes";
import { buildInterpretationHints } from "@/lib/ai/audit/auditInterpretationCatalog";
import { AUDIT_METHODOLOGY_WEIGHTS } from "@/lib/ai/audit/auditMethodologyWeights";
import { buildCandidateScreeningInterpretationHints } from "@/lib/ai/audit/buildCandidateScreeningInterpretationHints";
import { buildOdReserveInterpretationHints } from "@/lib/ai/audit/buildOdReserveInterpretationHints";
import {
  computeAuditRiskEngine,
  formatOrganizationalFitForPrompt,
} from "@/lib/ai/audit/computeAuditRiskEngine";
import { computeCandidateScreeningRiskEngine } from "@/lib/ai/audit/computeCandidateScreeningRiskEngine";
import { computeOdReserveRiskEngine } from "@/lib/ai/audit/computeOdReserveRiskEngine";
import { extractAuditSignals } from "@/lib/ai/audit/extractAuditSignals";
import { extractCandidateScreeningAuditSignals } from "@/lib/ai/audit/extractCandidateScreeningAuditSignals";
import { extractOdReserveAuditSignals } from "@/lib/ai/audit/extractOdReserveAuditSignals";
import { CANDIDATE_SCREENING_METHODOLOGY_WEIGHTS } from "@/lib/ai/audit/candidateScreeningMethodologyWeights";
import { OD_RESERVE_METHODOLOGY_WEIGHTS } from "@/lib/ai/audit/odReserveMethodologyWeights";
import { sanitizeForAiInput } from "@/lib/ai/sanitizeForAi";
import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";

/**
 * Собирает payload enterprise-pipeline: сигналы → risk engine → hints (без PDF и сырых ответов).
 */
export function buildAuditAiPipelinePayload(input: {
  fullName: string;
  sessionId: string;
  assesseeKey: string;
  answers: AuditAnswersMap;
  report: AuditReportJson;
  reportProfile?: AuditReportProfile;
}): AuditAiPipelinePayload {
  const reportProfile = input.reportProfile ?? "full_state_audit";

  if (reportProfile === "od_reserve" || reportProfile === "tu_management_chef") {
    const signals = extractOdReserveAuditSignals(input.answers);
    const riskProfile = computeOdReserveRiskEngine(signals);
    const interpretationHints = buildOdReserveInterpretationHints(signals);
    return {
      participant: {
        fullName: sanitizeForAiInput(input.fullName, 200),
        sessionId: sanitizeForAiInput(input.sessionId, 200),
        assesseeKey: sanitizeForAiInput(input.assesseeKey, 200),
      },
      signals,
      riskProfile,
      interpretationHints,
      yearOverYear: input.report.yoy,
      methodologyWeights: { ...OD_RESERVE_METHODOLOGY_WEIGHTS },
    };
  }

  if (reportProfile === "candidate_screening") {
    const signals = extractCandidateScreeningAuditSignals(input.answers);
    const riskProfile = computeCandidateScreeningRiskEngine(signals);
    const interpretationHints = buildCandidateScreeningInterpretationHints(signals);
    return {
      participant: {
        fullName: sanitizeForAiInput(input.fullName, 200),
        sessionId: sanitizeForAiInput(input.sessionId, 200),
        assesseeKey: sanitizeForAiInput(input.assesseeKey, 200),
      },
      signals,
      riskProfile,
      interpretationHints,
      yearOverYear: input.report.yoy,
      methodologyWeights: { ...CANDIDATE_SCREENING_METHODOLOGY_WEIGHTS },
    };
  }

  const signals = extractAuditSignals(input.answers);
  const riskProfile = computeAuditRiskEngine(signals);
  const interpretationHints = buildInterpretationHints(signals);

  return {
    participant: {
      fullName: sanitizeForAiInput(input.fullName, 200),
      sessionId: sanitizeForAiInput(input.sessionId, 200),
      assesseeKey: sanitizeForAiInput(input.assesseeKey, 200),
    },
    signals,
    riskProfile,
    interpretationHints,
    yearOverYear: input.report.yoy,
    methodologyWeights: { ...AUDIT_METHODOLOGY_WEIGHTS },
  };
}

/**
 * Компактное сообщение для LLM synthesis (только структурированные сигналы и risk engine).
 */
export function buildAuditAiPipelineUserMessage(payload: AuditAiPipelinePayload): string {
  const riskSummary = {
    burnoutRisk: payload.riskProfile.burnoutRisk,
    retentionProbability: payload.riskProfile.retentionProbability,
    conflictRisk: payload.riskProfile.conflictRisk,
    sabotageRisk: payload.riskProfile.sabotageRisk,
    motivationLossRisk: payload.riskProfile.motivationLossRisk,
    organizationalFit: formatOrganizationalFitForPrompt(payload.riskProfile.organizationalFit),
    weightedItems: payload.riskProfile.items.map((item) => ({
      key: item.key,
      label: item.label,
      level: item.level,
      score: item.score,
      weight: item.weight,
      evidence: item.evidence,
    })),
  };

  const yoyBlock = _formatYearOverYear(payload);

  return JSON.stringify(
    {
      participant: payload.participant,
      normalizedSignals: payload.signals,
      riskProfile: riskSummary,
      interpretationHints: payload.interpretationHints,
      methodologyWeights: payload.methodologyWeights,
      yearOverYear: yoyBlock,
    },
    null,
    0
  );
}

function _formatYearOverYear(payload: AuditAiPipelinePayload): Record<string, unknown> {
  if (payload.yearOverYear === null) {
    return { status: "no_previous_wave" };
  }
  return {
    status: "comparison_available",
    previousSessionId: payload.yearOverYear.previousSessionId,
    previousCreatedAt: payload.yearOverYear.previousCreatedAt,
    deltas: payload.yearOverYear.deltas.map((d) => ({
      key: d.key,
      label: d.label,
      before: d.before,
      after: d.after,
      delta: d.delta,
    })),
  };
}
