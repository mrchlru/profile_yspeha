import type { ProfSbEducationReportJson, ProfSbEducationReportView } from "@/lib/profSbEducation/profSbEducationTypes";
import {
  buildProfSbEducationQuestionnaireBlocks,
  extractStep4DataFromProfAnswers,
} from "@/lib/profSbEducation/buildProfSbEducationQuestionnaireBlocks";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { reconcileProfSbEducationFolderLinks } from "@/lib/profSbEducation/reconcileProfSbEducationFolderLinks";
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

  const answers = row.answers as Record<string, unknown>;
  const step4 = extractStep4DataFromProfAnswers(answers);

  return {
    sessionId: row.sessionId,
    personName: `${row.lastName} ${row.firstName}`,
    createdAt: formatMoscowDateTime(row.createdAt),
    report: (row.profReport as ProfSbEducationReportJson | null) ?? null,
    answers,
    questionnaireBlocks: buildProfSbEducationQuestionnaireBlocks(step4),
  };
}

/**
 * Проверяет, что сессия анкеты принадлежит папке кандидата.
 */
export async function assertProfSbEducationSessionInFolder(
  folderKey: string,
  sessionId: string
): Promise<boolean> {
  const existing = await prisma.profSbEducationSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { id: true },
  });
  if (existing) {
    return true;
  }

  try {
    await reconcileProfSbEducationFolderLinks();
  } catch {
    return false;
  }

  const linked = await prisma.profSbEducationSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { id: true },
  });
  return linked !== null;
}
