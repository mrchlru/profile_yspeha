import { sanitizeForAiInput } from "@/lib/ai/sanitizeForAi";
import { buildAttestationConclusionContext } from "@/lib/ai/buildAttestationConclusionContext";
import type { AttestationEmployeeMeta } from "@/lib/attestation/attestationEmployeeMeta";
import { ROSENZWEIG_SITUATIONS } from "@/lib/attestation/attestationQuestions";
import type { AttestationAnswers } from "@/lib/attestation/attestationQuestions";
import type { AttestationComputedScores } from "@/lib/attestation/computeAttestationScores";
import type { RosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";

/**
 * Контекст для краткого отчёта: баллы + должность + цитаты Розенцвейга.
 */
export function buildAttestationBriefReportContext(input: {
  personName: string;
  scores: AttestationComputedScores;
  answers: AttestationAnswers;
  rosenzweigCodingSummary: RosenzweigCodingSummary | null;
  employeeMeta: AttestationEmployeeMeta;
}): string {
  const scoresContext = buildAttestationConclusionContext({
    personName: input.personName,
    scores: input.scores,
    rosenzweigCodingSummary: input.rosenzweigCodingSummary,
    reportAudience: "line_manager_brief",
    employeeMeta: input.employeeMeta,
  });

  const quotes = _rosenzweigQuotesForBrief(input.answers);
  const payload = {
    employeeMeta: input.employeeMeta,
    rosenzweigAnswerQuotes: quotes,
    note:
      "Используй цитаты дословно или близко к тексту в разделах про риски, подковерные игры и разговор с руководителем. " +
      "roleSubtitle и managerAudienceLine из employeeMeta не перефразируй.",
  };

  return `${scoresContext}\n\n--- brief narrative payload ---\n${JSON.stringify(payload, null, 2)}`;
}

function _rosenzweigQuotesForBrief(
  answers: AttestationAnswers
): ReadonlyArray<{ situationId: string; excerpt: string }> {
  const items: Array<{ situationId: string; excerpt: string }> = [];
  for (const situation of ROSENZWEIG_SITUATIONS) {
    const raw = answers[situation.id];
    if (typeof raw !== "string") {
      continue;
    }
    const trimmed = sanitizeForAiInput(raw.trim(), 500);
    if (trimmed.length < 8) {
      continue;
    }
    items.push({
      situationId: situation.id,
      excerpt: trimmed,
    });
  }
  return items.slice(0, 24);
}
