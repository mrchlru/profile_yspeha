import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { computeAttestationScores } from "@/lib/attestation/computeAttestationScores";
import type { AttestationAnswers } from "@/lib/attestation/attestationQuestions";
import {
  computeRosenzweigCodingSummary,
  type RosenzweigCodingMap,
} from "@/lib/attestation/rosenzweigCoding";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

export type AttestationReportView = {
  sessionId: string;
  personName: string;
  folderKey: string | null;
  createdAt: string;
  computedAt: string | null;
  report: AttestationReportJson;
  answers: AttestationAnswers;
  rosenzweigCoding: RosenzweigCodingMap;
};

/**
 * Загружает и нормализует отчёт аттестации для просмотра в админке.
 */
export async function buildAttestationReportView(
  sessionId: string
): Promise<AttestationReportView | null> {
  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
      attestationReport: true,
      rosenzweigCoding: true,
      answers: true,
    },
  });
  if (!row || !row.answers || typeof row.answers !== "object") {
    return null;
  }

  const answers = row.answers as AttestationAnswers;
  const report = _resolveReport(row.attestationReport, answers, row.rosenzweigCoding);
  if (!report) {
    return null;
  }

  const coding =
    row.rosenzweigCoding && typeof row.rosenzweigCoding === "object"
      ? (row.rosenzweigCoding as RosenzweigCodingMap)
      : {};

  return {
    sessionId: row.sessionId,
    personName: `${row.lastName} ${row.firstName}`,
    folderKey: row.candidateFolderKey,
    createdAt: row.createdAt.toISOString(),
    computedAt: report.computedAt,
    report,
    answers,
    rosenzweigCoding: coding,
  };
}

/**
 * Проверяет, что сессия аттестации принадлежит папке сотрудника.
 */
export async function assertAttestationSessionInFolder(
  folderKey: string,
  sessionId: string
): Promise<boolean> {
  const row = await prisma.attestationSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { sessionId: true },
  });
  return row !== null;
}

function _resolveReport(
  stored: unknown,
  answers: AttestationAnswers,
  codingRaw: unknown
): AttestationReportJson | null {
  const coding =
    codingRaw && typeof codingRaw === "object" ? (codingRaw as RosenzweigCodingMap) : {};
  const codingSummary =
    Object.keys(coding).length > 0 ? computeRosenzweigCodingSummary(coding) : null;

  if (stored && typeof stored === "object") {
    const report = stored as AttestationReportJson;
    if (report.scores) {
      return {
        ...report,
        rosenzweigCodingSummary: report.rosenzweigCodingSummary ?? codingSummary,
      };
    }
  }

  const scores = computeAttestationScores(answers);
  return {
    scores,
    rosenzweigCodingSummary: codingSummary,
    computedAt: formatMoscowDateTime(new Date()),
  };
}
