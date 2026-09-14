import {
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_STATE_AUDIT,
  TEST_KIND_STATE_AUDIT_DEV,
} from "@/lib/access/testKinds";
import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { prisma } from "@/lib/prisma";

const AUDIT_INVITE_KINDS = [
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_STATE_AUDIT,
  TEST_KIND_STATE_AUDIT_DEV,
] as const;

/**
 * Привязывает «осиротевшие» audit-прохождения к единственной подходящей
 * candidate-папке (по приглашению или по ФИО), чтобы не плодить `audit:`-дубли.
 */
export async function reconcileOrphanAuditFolderLinks(): Promise<number> {
  const orphans = await prisma.auditSubmission.findMany({
    where: { candidateFolderKey: null },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });

  if (orphans.length === 0) {
    return 0;
  }

  const invites = await prisma.accessInvite.findMany({
    where: {
      testKind: { in: [...AUDIT_INVITE_KINDS] },
      candidateFolderKey: { not: null },
      usedAt: { not: null },
      candidateLastName: { not: null },
      candidateFirstName: { not: null },
    },
    orderBy: { usedAt: "desc" },
    take: 800,
    select: {
      candidateFolderKey: true,
      candidateLastName: true,
      candidateFirstName: true,
      usedAt: true,
    },
  });

  const folderRecords = await prisma.candidateFolderRecord.findMany({
    select: {
      folderKey: true,
      lastName: true,
      firstName: true,
    },
    take: 2000,
  });

  let fixed = 0;
  for (const row of orphans) {
    const folderKey = _resolveFolderKeyForOrphanAudit(row, invites, folderRecords);
    if (!folderKey) {
      continue;
    }
    await prisma.auditSubmission.update({
      where: { id: row.id },
      data: { candidateFolderKey: folderKey },
    });
    fixed += 1;
  }

  return fixed;
}

function _resolveFolderKeyForOrphanAudit(
  row: {
    assesseeKey: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
  },
  invites: ReadonlyArray<{
    candidateFolderKey: string | null;
    candidateLastName: string | null;
    candidateFirstName: string | null;
    usedAt: Date | null;
  }>,
  folderRecords: ReadonlyArray<{
    folderKey: string;
    lastName: string;
    firstName: string;
  }>
): string | null {
  const inviteMatches: Array<{ folderKey: string; distanceMs: number }> = [];
  for (const invite of invites) {
    if (!invite.candidateFolderKey || !invite.usedAt) {
      continue;
    }
    const assessee = buildAuditAssesseeKey({
      lastName: invite.candidateLastName ?? "",
      firstName: invite.candidateFirstName ?? "",
    });
    if (assessee === null || assessee.key !== row.assesseeKey) {
      continue;
    }
    inviteMatches.push({
      folderKey: invite.candidateFolderKey,
      distanceMs: Math.abs(invite.usedAt.getTime() - row.createdAt.getTime()),
    });
  }

  if (inviteMatches.length > 0) {
    inviteMatches.sort((a, b) => a.distanceMs - b.distanceMs);
    return inviteMatches[0]?.folderKey ?? null;
  }

  const recordKeys = new Set<string>();
  for (const record of folderRecords) {
    const assessee = buildAuditAssesseeKey({
      lastName: record.lastName,
      firstName: record.firstName,
    });
    if (assessee !== null && assessee.key === row.assesseeKey) {
      recordKeys.add(record.folderKey);
    }
  }

  if (recordKeys.size === 1) {
    return [...recordKeys][0] ?? null;
  }

  return null;
}
