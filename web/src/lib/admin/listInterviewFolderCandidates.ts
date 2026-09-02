import { candidatePositionLevelLabel } from "@/lib/admin/candidatePositionLevels";
import type {
  InterviewFolderCandidateSummary,
  InterviewFolderScreeningReportSession,
} from "@/lib/admin/candidateFolderTypes";
import {
  CANDIDATE_LIFECYCLE_INTERVIEW,
} from "@/lib/admin/candidateFolderTypes";
import { loadCandidateFolderStatusMap } from "@/lib/admin/candidateFolderLifecycle";
import { buildCandidateDisplayName } from "@/lib/admin/candidateSearch";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { prisma } from "@/lib/prisma";

/**
 * Список кандидатов в папке вакансии (раздел «Собеседование»).
 */
export async function listInterviewFolderCandidates(
  interviewFolderKey: string
): Promise<ReadonlyArray<InterviewFolderCandidateSummary>> {
  const [invites, submissions] = await Promise.all([
    prisma.accessInvite.findMany({
      where: {
        testKind: TEST_KIND_SCREENING,
        interviewFolderKey,
        candidateFolderKey: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        candidateFolderKey: true,
        candidateLastName: true,
        candidateFirstName: true,
        candidateMiddleName: true,
        candidateBirthDate: true,
        candidatePositionLevel: true,
        createdAt: true,
        usedAt: true,
      },
    }),
    prisma.screeningSubmission.findMany({
      where: { interviewFolderKey },
      orderBy: { createdAt: "desc" },
      select: {
        candidateFolderKey: true,
        createdAt: true,
      },
    }),
  ]);

  type Acc = {
    folderKey: string;
    displayName: string;
    lastName: string;
    firstName: string;
    middleName: string | null;
    birthDate: Date | null;
    positionLevel: string | null;
    pendingInvite: boolean;
    screeningSessions: number;
    lastActivityAt: Date | null;
  };

  const map = new Map<string, Acc>();

  for (const row of invites) {
    const key = row.candidateFolderKey;
    if (!key || !row.candidateLastName || !row.candidateFirstName) {
      continue;
    }
    const existing = map.get(key);
    map.set(key, {
      folderKey: key,
      displayName: buildCandidateDisplayName({
        lastName: row.candidateLastName,
        firstName: row.candidateFirstName,
        middleName: row.candidateMiddleName,
        birthDate: row.candidateBirthDate,
      }),
      lastName: row.candidateLastName,
      firstName: row.candidateFirstName,
      middleName: row.candidateMiddleName,
      birthDate: row.candidateBirthDate,
      positionLevel: row.candidatePositionLevel,
      pendingInvite: existing?.pendingInvite || row.usedAt === null,
      screeningSessions: existing?.screeningSessions ?? 0,
      lastActivityAt:
        existing?.lastActivityAt && existing.lastActivityAt > row.createdAt
          ? existing.lastActivityAt
          : row.createdAt,
    });
  }

  for (const row of submissions) {
    const key = row.candidateFolderKey;
    if (!key) {
      continue;
    }
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        folderKey: key,
        displayName: key,
        lastName: "",
        firstName: "",
        middleName: null,
        birthDate: null,
        positionLevel: null,
        pendingInvite: false,
        screeningSessions: 1,
        lastActivityAt: row.createdAt,
      });
      continue;
    }
    map.set(key, {
      ...existing,
      pendingInvite: false,
      screeningSessions: existing.screeningSessions + 1,
      lastActivityAt:
        existing.lastActivityAt && existing.lastActivityAt > row.createdAt
          ? existing.lastActivityAt
          : row.createdAt,
    });
  }

  const folderKeys = [...map.keys()];
  const [statusMap, screeningReports] = await Promise.all([
    loadCandidateFolderStatusMap(folderKeys),
    prisma.screeningSubmission.findMany({
      where: {
        candidateFolderKey: { in: folderKeys },
      },
      orderBy: { createdAt: "desc" },
      select: {
        candidateFolderKey: true,
        sessionId: true,
        createdAt: true,
        profileName: true,
        kotReport: true,
      },
    }),
  ]);

  const reportsByFolder = new Map<string, InterviewFolderScreeningReportSession[]>();
  for (const row of screeningReports) {
    if (row.kotReport === null) {
      continue;
    }
    const key = row.candidateFolderKey;
    if (!key) {
      continue;
    }
    const list = reportsByFolder.get(key) ?? [];
    list.push({
      sessionId: row.sessionId,
      label: `${row.profileName} — ${formatMoscowDateTime(row.createdAt)}`,
      createdAt: row.createdAt.toISOString(),
    });
    reportsByFolder.set(key, list);
  }

  return [...map.values()]
    .map((row) => {
      const status = statusMap.get(row.folderKey);
      return {
        folderKey: row.folderKey,
        displayName: row.displayName,
        lifecycleStatus: status?.lifecycleStatus ?? CANDIDATE_LIFECYCLE_INTERVIEW,
        hasScreening: row.screeningSessions > 0,
        pendingInvite: row.pendingInvite,
        screeningSessions: row.screeningSessions,
        screeningReportSessions: reportsByFolder.get(row.folderKey) ?? [],
        lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
        positionLevelLabel: row.positionLevel
          ? candidatePositionLevelLabel(row.positionLevel)
          : null,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const bTime = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return bTime - aTime;
    });
}
