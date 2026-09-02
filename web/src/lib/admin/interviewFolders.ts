import type { InterviewFolderSummary } from "@/lib/admin/interviewFolderTypes";
import { buildInterviewFolderIdentity } from "@/lib/admin/interviewFolderTypes";
import { prisma } from "@/lib/prisma";

export type ResolvedInterviewFolder = {
  key: string;
  displayName: string;
  positionTitle: string;
};

/**
 * Создаёт папку собеседования для новой вакансии (должность + дата первого скрининга).
 */
export async function createInterviewFolderForPosition(
  positionTitle: string,
  firstScreeningAt: Date = _todayUtcNoon()
): Promise<ResolvedInterviewFolder | { error: string }> {
  const identity = buildInterviewFolderIdentity(positionTitle, firstScreeningAt);
  if (!identity) {
    return { error: "Укажите название должности" };
  }

  const existing = await prisma.interviewFolder.findUnique({
    where: { key: identity.key },
    select: { key: true, displayName: true, positionTitle: true },
  });
  if (existing) {
    return {
      key: existing.key,
      displayName: existing.displayName,
      positionTitle: existing.positionTitle,
    };
  }

  const row = await prisma.interviewFolder.create({
    data: {
      key: identity.key,
      positionTitle: identity.positionTitleDisplay,
      firstScreeningAt,
      displayName: identity.displayName,
    },
    select: {
      key: true,
      displayName: true,
      positionTitle: true,
    },
  });

  return row;
}

/**
 * Возвращает папку собеседования по ключу.
 */
export async function getInterviewFolderByKey(
  folderKey: string
): Promise<ResolvedInterviewFolder | null> {
  const row = await prisma.interviewFolder.findUnique({
    where: { key: folderKey },
    select: { key: true, displayName: true, positionTitle: true },
  });
  return row;
}

/**
 * Список папок раздела «Собеседование» с количеством скринингов.
 */
export async function listInterviewFolders(
  searchQuery?: string
): Promise<ReadonlyArray<InterviewFolderSummary>> {
  const rows = await prisma.interviewFolder.findMany({
    orderBy: [{ firstScreeningAt: "desc" }, { createdAt: "desc" }],
    select: {
      key: true,
      displayName: true,
      positionTitle: true,
      firstScreeningAt: true,
      createdAt: true,
    },
  });

  const keys = rows.map((row) => row.key);
  const [screeningCounts, pendingInviteCounts, candidateCounts] = await Promise.all([
    keys.length > 0
      ? prisma.screeningSubmission.groupBy({
          by: ["interviewFolderKey"],
          where: { interviewFolderKey: { in: keys } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    keys.length > 0
      ? prisma.accessInvite.groupBy({
          by: ["interviewFolderKey"],
          where: { interviewFolderKey: { in: keys }, usedAt: null },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    _countInterviewFolderCandidates(keys),
  ]);

  const screeningMap = new Map(
    screeningCounts.map((row) => [row.interviewFolderKey, row._count._all])
  );
  const pendingInviteMap = new Map(
    pendingInviteCounts.map((row) => [row.interviewFolderKey, row._count._all])
  );

  const normalizedQuery = searchQuery?.trim().toLowerCase() ?? "";

  return rows
    .map((row) => ({
      key: row.key,
      displayName: row.displayName,
      positionTitle: row.positionTitle,
      firstScreeningAt: row.firstScreeningAt.toISOString().slice(0, 10),
      screeningCount: screeningMap.get(row.key) ?? 0,
      candidateCount: candidateCounts.get(row.key) ?? 0,
      pendingInviteCount: pendingInviteMap.get(row.key) ?? 0,
      lastActivityAt: row.createdAt.toISOString(),
    }))
    .filter((row) => {
      if (!normalizedQuery) {
        return true;
      }
      const haystack = `${row.displayName} ${row.positionTitle}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
}

/**
 * Считает уникальных кандидатов в каждой папке собеседования.
 */
async function _countInterviewFolderCandidates(
  folderKeys: ReadonlyArray<string>
): Promise<Map<string, number>> {
  const perFolder = new Map<string, Set<string>>();
  for (const key of folderKeys) {
    perFolder.set(key, new Set());
  }
  if (folderKeys.length === 0) {
    return new Map();
  }

  const [invites, submissions] = await Promise.all([
    prisma.accessInvite.findMany({
      where: {
        interviewFolderKey: { in: [...folderKeys] },
        candidateFolderKey: { not: null },
      },
      select: { interviewFolderKey: true, candidateFolderKey: true },
    }),
    prisma.screeningSubmission.findMany({
      where: { interviewFolderKey: { in: [...folderKeys] } },
      select: { interviewFolderKey: true, candidateFolderKey: true },
    }),
  ]);

  for (const row of invites) {
    if (!row.interviewFolderKey || !row.candidateFolderKey) {
      continue;
    }
    perFolder.get(row.interviewFolderKey)?.add(row.candidateFolderKey);
  }
  for (const row of submissions) {
    if (!row.interviewFolderKey || !row.candidateFolderKey) {
      continue;
    }
    perFolder.get(row.interviewFolderKey)?.add(row.candidateFolderKey);
  }

  return new Map([...perFolder.entries()].map(([key, set]) => [key, set.size]));
}

function _todayUtcNoon(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
}

