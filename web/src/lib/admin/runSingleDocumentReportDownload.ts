import { assertAttestationSessionInFolder } from "@/lib/admin/buildAttestationReportView";
import { assertSpecialistScreeningSessionInFolder } from "@/lib/admin/buildSpecialistScreeningReportView";
import { assertProfSbEducationSessionInFolder } from "@/lib/admin/buildProfSbEducationReportView";
import { formatReportExportFileStem } from "@/lib/admin/formatReportExportFileName";
import {
  generateAttestationReportDocxBySession,
  generateBurnoutReportDocxBySession,
  generateProfSbEducationReportDocxBySession,
  generateSpecialistScreeningReportDocxBySession,
} from "@/lib/admin/generateReportExportDocxBySession";
import { prisma } from "@/lib/prisma";

export type DocumentReportDownloadKind =
  | "attestation"
  | "burnout"
  | "prof_sb_education"
  | "specialist_screening";

export type DocumentReportDownloadResult = {
  fileName: string;
  buffer: Buffer;
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;

/**
 * Формирует один файл Word для отчёта документного типа (без PDF-шаблона).
 */
export async function runSingleDocumentReportDownload(input: {
  kind: DocumentReportDownloadKind;
  sessionId: string;
  folderKey: string;
}): Promise<DocumentReportDownloadResult | null> {
  const allowed = await _assertSessionInFolder(input.kind, input.folderKey, input.sessionId);
  if (!allowed) {
    return null;
  }

  const meta = await _loadSessionMeta(input.kind, input.sessionId);
  if (!meta) {
    return null;
  }

  const buffer = await _generateDocx(input.kind, input.sessionId);
  if (!buffer || buffer.length === 0) {
    return null;
  }

  const stem = formatReportExportFileStem(meta.lastName, meta.firstName, meta.completedAt);
  return {
    fileName: `${stem}.docx`,
    buffer,
    contentType: DOCX_CONTENT_TYPE,
  };
}

async function _assertSessionInFolder(
  kind: DocumentReportDownloadKind,
  folderKey: string,
  sessionId: string
): Promise<boolean> {
  switch (kind) {
    case "attestation":
      return assertAttestationSessionInFolder(folderKey, sessionId);
    case "specialist_screening":
      return assertSpecialistScreeningSessionInFolder(folderKey, sessionId);
    case "prof_sb_education":
      return assertProfSbEducationSessionInFolder(folderKey, sessionId);
    case "burnout":
      return _assertBurnoutSessionInFolder(folderKey, sessionId);
    default:
      return false;
  }
}

async function _assertBurnoutSessionInFolder(
  folderKey: string,
  sessionId: string
): Promise<boolean> {
  const row = await prisma.burnoutSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { sessionId: true },
  });
  return row !== null;
}

async function _loadSessionMeta(
  kind: DocumentReportDownloadKind,
  sessionId: string
): Promise<{ lastName: string; firstName: string; completedAt: Date } | null> {
  switch (kind) {
    case "attestation": {
      const row = await prisma.attestationSubmission.findUnique({
        where: { sessionId },
        select: { lastName: true, firstName: true, createdAt: true },
      });
      return row ? { ...row, completedAt: row.createdAt } : null;
    }
    case "burnout": {
      const row = await prisma.burnoutSubmission.findUnique({
        where: { sessionId },
        select: { lastName: true, firstName: true, createdAt: true },
      });
      return row ? { ...row, completedAt: row.createdAt } : null;
    }
    case "prof_sb_education": {
      const row = await prisma.profSbEducationSubmission.findUnique({
        where: { sessionId },
        select: { lastName: true, firstName: true, createdAt: true },
      });
      return row ? { ...row, completedAt: row.createdAt } : null;
    }
    case "specialist_screening": {
      const row = await prisma.specialistScreeningSubmission.findUnique({
        where: { sessionId },
        select: { lastName: true, firstName: true, createdAt: true },
      });
      return row ? { ...row, completedAt: row.createdAt } : null;
    }
    default:
      return null;
  }
}

async function _generateDocx(
  kind: DocumentReportDownloadKind,
  sessionId: string
): Promise<Buffer | null> {
  switch (kind) {
    case "attestation":
      return generateAttestationReportDocxBySession(sessionId);
    case "burnout":
      return generateBurnoutReportDocxBySession(sessionId);
    case "prof_sb_education":
      return generateProfSbEducationReportDocxBySession(sessionId);
    case "specialist_screening":
      return generateSpecialistScreeningReportDocxBySession(sessionId);
    default:
      return null;
  }
}
