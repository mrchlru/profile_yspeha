import { buildAttestationBriefReportDocx } from "@/lib/admin/buildAttestationBriefReportDocx";
import { isAttestationBriefReportJson } from "@/lib/attestation/attestationBriefReportTypes";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

/**
 * Word-версия краткого отчёта по аттестации для сессии.
 */
export async function generateAttestationBriefReportDocxBySession(
  sessionId: string
): Promise<Buffer | null> {
  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: {
      firstName: true,
      lastName: true,
      createdAt: true,
      attestationReport: true,
    },
  });
  if (!row?.attestationReport || typeof row.attestationReport !== "object") {
    return null;
  }

  const report = row.attestationReport as unknown as AttestationReportJson;
  const brief = report.briefReport;
  if (!brief || !isAttestationBriefReportJson(brief)) {
    return null;
  }

  const personName = `${row.lastName} ${row.firstName}`.trim();
  const attestationDateLabel =
    formatMoscowDateTime(row.createdAt.toISOString()).split(",")[0]?.trim() ?? "";
  const reportDateLabel =
    brief.generatedAt.split(",")[0] ?? formatMoscowDateTime(new Date()).split(",")[0] ?? "";

  return buildAttestationBriefReportDocx(brief, {
    personName,
    attestationDateLabel,
    reportDateLabel,
  });
}
