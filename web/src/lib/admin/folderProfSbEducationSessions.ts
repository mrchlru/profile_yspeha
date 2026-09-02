import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import type { ProfSbEducationReportJson } from "@/lib/profSbEducation/profSbEducationTypes";
import { prisma } from "@/lib/prisma";

export type FolderProfSbEducationSessionRef = {
  sessionId: string;
  label: string;
  createdAt: string;
  pendingMethodology: boolean;
};

/**
 * Возвращает прохождения анкеты ПРОФ СБ + ПРОФ образование в папке кандидата.
 */
export async function listFolderProfSbEducationSessions(
  folderKey: string
): Promise<FolderProfSbEducationSessionRef[]> {
  const rows = await prisma.profSbEducationSubmission.findMany({
    where: { candidateFolderKey: folderKey },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      lastName: true,
      firstName: true,
      profReport: true,
    },
  });

  return rows.map((row) => {
    const report = row.profReport as ProfSbEducationReportJson | null;
    return {
      sessionId: row.sessionId,
      label: `${row.lastName} ${row.firstName} — ${formatMoscowDateTime(row.createdAt)}`,
      createdAt: row.createdAt.toISOString(),
      pendingMethodology: report?.status !== "computed",
    };
  });
}
