import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import { generateAuditManagerPdfBuffer } from "@/lib/report/generateAuditPdf";
import { prisma } from "@/lib/prisma";

function _parseAuditReport(value: unknown): AuditReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<AuditReportJson>;
  if (row.version !== 1 || !row.managerBrief || !Array.isArray(row.testBlocks)) {
    return null;
  }
  return row as AuditReportJson;
}

/**
 * Генерирует PDF «Отчёт для руководителя» из сохранённой сессии аудита.
 */
export async function generateAuditManagerReportPdfBySession(
  sessionId: string
): Promise<Buffer | null> {
  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      auditReport: true,
    },
  });

  if (!row) {
    return null;
  }

  const report = _parseAuditReport(row.auditReport);
  if (!report) {
    return null;
  }

  const fullName = `${row.lastName} ${row.firstName}`.trim();
  return generateAuditManagerPdfBuffer({
    fullName,
    sessionId: row.sessionId,
    report,
  });
}
