import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { prisma } from "@/lib/prisma";

export type FolderAttestationSessionRef = {
  sessionId: string;
  label: string;
  createdAt: string;
  hasReport: boolean;
};

/**
 * Возвращает прохождения аттестации в папке кандидата.
 */
export async function listFolderAttestationSessions(
  folderKey: string
): Promise<FolderAttestationSessionRef[]> {
  const rows = await prisma.attestationSubmission.findMany({
    where: { candidateFolderKey: folderKey },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      lastName: true,
      firstName: true,
      attestationReport: true,
    },
  });

  return rows.map((row) => {
    const report = row.attestationReport as AttestationReportJson | null;
    return {
      sessionId: row.sessionId,
      label: `${row.lastName} ${row.firstName} — ${formatMoscowDateTime(row.createdAt)}`,
      createdAt: row.createdAt.toISOString(),
      hasReport: report !== null && report.scores !== undefined,
    };
  });
}
