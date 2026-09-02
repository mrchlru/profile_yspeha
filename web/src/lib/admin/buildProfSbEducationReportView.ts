import type { ProfSbEducationReportJson, ProfSbEducationReportView } from "@/lib/profSbEducation/profSbEducationTypes";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

export type { ProfSbEducationReportView };

/**
 * Собирает данные для просмотра результата анкеты в админке.
 */
export async function buildProfSbEducationReportView(
  sessionId: string
): Promise<ProfSbEducationReportView | null> {
  const row = await prisma.profSbEducationSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      answers: true,
      profReport: true,
    },
  });
  if (!row) {
    return null;
  }

  return {
    sessionId: row.sessionId,
    personName: `${row.lastName} ${row.firstName}`,
    createdAt: formatMoscowDateTime(row.createdAt),
    report: (row.profReport as ProfSbEducationReportJson | null) ?? null,
    answers: row.answers as Record<string, unknown>,
  };
}

/**
 * Проверяет, что сессия анкеты принадлежит папке кандидата.
 */
export async function assertProfSbEducationSessionInFolder(
  folderKey: string,
  sessionId: string
): Promise<boolean> {
  const row = await prisma.profSbEducationSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { id: true },
  });
  return row !== null;
}
