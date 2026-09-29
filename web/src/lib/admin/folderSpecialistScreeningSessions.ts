import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { buildSpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import type { SpecialistScreeningReportJson } from "@/lib/specialistScreening/specialistScreeningReportTypes";
import { prisma } from "@/lib/prisma";

export type FolderSpecialistScreeningSessionRef = {
  sessionId: string;
  label: string;
  createdAt: string;
  referralSuggested: boolean;
  phq9Item9Positive: boolean;
};

/**
 * Возвращает прохождения скрининга направления к специалисту в папке.
 */
export async function listFolderSpecialistScreeningSessions(
  folderKey: string
): Promise<FolderSpecialistScreeningSessionRef[]> {
  const rows = await prisma.specialistScreeningSubmission.findMany({
    where: { candidateFolderKey: folderKey },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      lastName: true,
      firstName: true,
      specialistScreeningReport: true,
    },
  });

  return rows.map((row) => {
    const report = row.specialistScreeningReport as SpecialistScreeningReportJson | null;
    const interpretation =
      report?.interpretation ??
      (report?.scores ? buildSpecialistScreeningInterpretation(report.scores) : null);

    return {
      sessionId: row.sessionId,
      label: `${row.lastName} ${row.firstName} — ${formatMoscowDateTime(row.createdAt)}`,
      createdAt: row.createdAt.toISOString(),
      referralSuggested: interpretation?.referralSuggested === true,
      phq9Item9Positive: interpretation?.phq9Item9Positive === true,
    };
  });
}
