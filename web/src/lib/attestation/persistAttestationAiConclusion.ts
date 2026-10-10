import { Prisma } from "@/generated/prisma/client";

import { buildAttestationConclusionContext } from "@/lib/ai/buildAttestationConclusionContext";
import { generateAttestationConclusion } from "@/lib/ai/generateAttestationConclusion";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { computeRosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";
import type { RosenzweigCodingMap } from "@/lib/attestation/rosenzweigCoding";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

export type PersistAttestationAiConclusionResult = {
  conclusionText: string | null;
  managerActions: string | null;
  conclusionGeneratedAt: string | null;
  report: AttestationReportJson | null;
  /** true, если модель вернула заключение и отчёт записан в БД. */
  aiGenerated: boolean;
};

/**
 * Генерирует заключение ИИ по сессии аттестации и сохраняет в attestationReport.
 */
export async function persistAttestationAiConclusion(input: {
  sessionId: string;
  sessionRef: string;
  personName: string;
}): Promise<PersistAttestationAiConclusionResult> {
  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId: input.sessionId },
    select: {
      attestationReport: true,
      rosenzweigCoding: true,
    },
  });
  if (!row?.attestationReport || typeof row.attestationReport !== "object") {
    return {
      conclusionText: null,
      managerActions: null,
      conclusionGeneratedAt: null,
      report: null,
      aiGenerated: false,
    };
  }

  const report = row.attestationReport as unknown as AttestationReportJson;
  if (!report.scores) {
    return {
      conclusionText: null,
      managerActions: null,
      conclusionGeneratedAt: null,
      report: null,
      aiGenerated: false,
    };
  }

  const coding =
    row.rosenzweigCoding && typeof row.rosenzweigCoding === "object"
      ? (row.rosenzweigCoding as RosenzweigCodingMap)
      : {};
  const codingSummary =
    Object.keys(coding).length > 0
      ? computeRosenzweigCodingSummary(coding)
      : report.rosenzweigCodingSummary ?? null;

  const attestationContext = buildAttestationConclusionContext({
    personName: input.personName,
    scores: report.scores,
    rosenzweigCodingSummary: codingSummary,
  });

  const aiResult = await generateAttestationConclusion({
    attestationContext,
    sessionRef: input.sessionRef,
  });

  if (aiResult.conclusionText === null) {
    return {
      conclusionText: report.conclusionText ?? null,
      managerActions: report.managerActions ?? null,
      conclusionGeneratedAt: report.conclusionGeneratedAt ?? null,
      report,
      aiGenerated: false,
    };
  }

  const conclusionGeneratedAt = formatMoscowNow();
  const nextReport: AttestationReportJson = {
    ...report,
    rosenzweigCodingSummary: codingSummary,
    rosenzweigCodingMeta: report.rosenzweigCodingMeta ?? null,
    conclusionText: aiResult.conclusionText,
    managerActions: aiResult.managerActions,
    conclusionGeneratedAt,
  };

  await prisma.attestationSubmission.update({
    where: { sessionId: input.sessionId },
    data: { attestationReport: nextReport as unknown as Prisma.InputJsonValue },
  });

  return {
    conclusionText: aiResult.conclusionText,
    managerActions: aiResult.managerActions,
    conclusionGeneratedAt,
    report: nextReport,
    aiGenerated: true,
  };
}
