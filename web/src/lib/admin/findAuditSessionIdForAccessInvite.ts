import { normalizeAccessCode } from "@/lib/access/accessCode";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { prisma } from "@/lib/prisma";

/**
 * Ищет последнюю сессию аудита с сохранёнными ответами, связанную с кодом приглашения.
 */
export async function findAuditSessionIdForAccessInvite(
  rawCode: string
): Promise<string | null> {
  const code = normalizeAccessCode(rawCode);
  const invite = await prisma.accessInvite.findFirst({
    where: { code },
    select: {
      candidateFolderKey: true,
      candidateFirstName: true,
      candidateLastName: true,
      startedAt: true,
    },
  });
  if (invite === null) {
    return null;
  }

  if (invite.candidateFolderKey) {
    const byFolder = await prisma.auditSubmission.findFirst({
      where: { candidateFolderKey: invite.candidateFolderKey },
      orderBy: { createdAt: "desc" },
      select: { sessionId: true, answers: true },
    });
    if (byFolder !== null && _auditRowHasAnswers(byFolder.answers)) {
      return byFolder.sessionId;
    }
  }

  const lastName = invite.candidateLastName?.trim() ?? "";
  const firstName = invite.candidateFirstName?.trim() ?? "";
  if (lastName.length === 0 || firstName.length === 0) {
    return null;
  }

  const byName = await prisma.auditSubmission.findFirst({
    where: {
      lastName: { equals: lastName, mode: "insensitive" },
      firstName: { equals: firstName, mode: "insensitive" },
      ...(invite.startedAt !== null
        ? { createdAt: { gte: invite.startedAt } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { sessionId: true, answers: true },
  });
  if (byName !== null && _auditRowHasAnswers(byName.answers)) {
    return byName.sessionId;
  }

  return null;
}

function _auditRowHasAnswers(answers: unknown): boolean {
  if (typeof answers !== "object" || answers === null) {
    return false;
  }
  const map = parseAuditAnswersPayload(answers as Record<string, Record<string, unknown>>);
  return Object.keys(map).length > 0;
}
