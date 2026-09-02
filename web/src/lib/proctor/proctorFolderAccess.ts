import { parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import { prisma } from "@/lib/prisma";

/**
 * Собирает sessionId всех прохождений, связанных с папкой (скрининг, аудит, выгорание и т.д.).
 */
export async function collectFolderSubmissionSessionIds(folderKey: string): Promise<string[]> {
  const parsed = parseEmployeeFolderKey(folderKey);
  const sessionIds = new Set<string>();

  const [screeningRows, auditByFolder, burnoutRows, profRows] = await Promise.all([
    prisma.screeningSubmission.findMany({
      where: { candidateFolderKey: folderKey },
      select: { sessionId: true },
    }),
    prisma.auditSubmission.findMany({
      where: { candidateFolderKey: folderKey },
      select: { sessionId: true },
    }),
    prisma.burnoutSubmission.findMany({
      where: { candidateFolderKey: folderKey },
      select: { sessionId: true },
    }),
    prisma.profSbEducationSubmission.findMany({
      where: { candidateFolderKey: folderKey },
      select: { sessionId: true },
    }),
  ]);

  for (const row of screeningRows) sessionIds.add(row.sessionId);
  for (const row of auditByFolder) sessionIds.add(row.sessionId);
  for (const row of burnoutRows) sessionIds.add(row.sessionId);
  for (const row of profRows) sessionIds.add(row.sessionId);

  if (parsed?.kind === "audit") {
    const auditByAssessee = await prisma.auditSubmission.findMany({
      where: { assesseeKey: parsed.assesseeKey },
      select: { sessionId: true },
    });
    for (const row of auditByAssessee) sessionIds.add(row.sessionId);
  }

  return [...sessionIds];
}

/**
 * Проверяет, что proctor-сессия относится к папке сотрудника в админке.
 */
export async function proctorSessionBelongsToAdminFolder(
  sessionId: string,
  candidateFolderKey: string | null,
  adminFolderKey: string
): Promise<boolean> {
  if (candidateFolderKey === adminFolderKey) {
    return true;
  }
  const linkedSessionIds = await collectFolderSubmissionSessionIds(adminFolderKey);
  return linkedSessionIds.includes(sessionId);
}
