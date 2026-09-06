import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { extractStep4DataFromProfAnswers } from "@/lib/profSbEducation/buildProfSbEducationQuestionnaireBlocks";
import { prisma } from "@/lib/prisma";

export type FolderProfSbEducationSessionRef = {
  sessionId: string;
  label: string;
  createdAt: string;
  /** @deprecated Больше не используется в UI. */
  pendingMethodology: boolean;
  hasQuestionnaireData: boolean;
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
      answers: true,
    },
  });

  return rows.map((row) => {
    const hasQuestionnaireData = extractStep4DataFromProfAnswers(row.answers) !== null;
    return {
      sessionId: row.sessionId,
      label: `${row.lastName} ${row.firstName} — ${formatMoscowDateTime(row.createdAt)}`,
      createdAt: row.createdAt.toISOString(),
      pendingMethodology: false,
      hasQuestionnaireData,
    };
  });
}
