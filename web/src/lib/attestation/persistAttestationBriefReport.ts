import { Prisma } from "@/generated/prisma/client";

import { buildAttestationConclusionContext } from "@/lib/ai/buildAttestationConclusionContext";
import { generateAttestationBriefReport } from "@/lib/ai/generateAttestationBriefReport";
import type { AttestationBriefReportJson } from "@/lib/attestation/attestationBriefReportTypes";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { computeRosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";
import type { RosenzweigCodingMap } from "@/lib/attestation/rosenzweigCoding";
import { prisma } from "@/lib/prisma";

export type PersistAttestationBriefReportResult = {
  briefReport: AttestationBriefReportJson | null;
  aiGenerated: boolean;
};

/**
 * Генерирует краткий отчёт аттестации (ИИ) и сохраняет в attestationReport.briefReport.
 */
export async function persistAttestationBriefReport(input: {
  sessionId: string;
  sessionRef: string;
  personName: string;
}): Promise<PersistAttestationBriefReportResult> {
  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId: input.sessionId },
    select: {
      attestationReport: true,
      rosenzweigCoding: true,
    },
  });
  if (!row?.attestationReport || typeof row.attestationReport !== "object") {
    return { briefReport: null, aiGenerated: false };
  }

  const report = row.attestationReport as unknown as AttestationReportJson;
  if (!report.scores) {
    return { briefReport: null, aiGenerated: false };
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

  const brief = await generateAttestationBriefReport({
    attestationContext,
    sessionRef: input.sessionRef,
  });
  if (!brief) {
    return { briefReport: report.briefReport ?? null, aiGenerated: false };
  }

  const nextReport: AttestationReportJson = {
    ...report,
    rosenzweigCodingSummary: codingSummary,
    briefReport: brief,
  };

  await prisma.attestationSubmission.update({
    where: { sessionId: input.sessionId },
    data: { attestationReport: nextReport as unknown as Prisma.InputJsonValue },
  });

  return { briefReport: brief, aiGenerated: true };
}
