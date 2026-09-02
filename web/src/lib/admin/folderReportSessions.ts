import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import type { AuditDashboardSource } from "@/lib/admin/buildEmployeeDashboardVisual";
import { parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type FolderReportSource = "screening" | "audit";

export type FolderReportSessionRef = {
  sessionId: string;
  source: FolderReportSource;
  label: string;
  createdAt: string;
};

/**
 * Возвращает сессии с отчётами, привязанные к папке сотрудника.
 */
export async function listFolderReportSessions(
  folderKey: string
): Promise<FolderReportSessionRef[]> {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (!parsed) {
    return [];
  }

  if (parsed.kind === "candidate") {
    const screeningSessions = await _listCandidateScreeningSessions(parsed.folderKey);
    const auditSessions = await _listCandidateAuditSessions(parsed.folderKey);
    return [...auditSessions, ...screeningSessions].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }

  return _listAssesseeAuditSessions(parsed.assesseeKey);
}

/**
 * Загружает JSON последнего audit-отчёта для папки (кандидат или сотрудник аудита).
 */
export async function loadLatestAuditReportJsonForFolder(
  folderKey: string
): Promise<unknown | null> {
  const source = await loadLatestAuditDashboardSource(folderKey);
  return source?.auditReport ?? null;
}

/**
 * Загружает отчёт, ответы и метаданные сессии для визуального дашборда.
 * Также подгружает предыдущую по времени audit-сессию того же сотрудника,
 * чтобы построить сравнение «год к году» (текущий vs прошлый период).
 */
export async function loadLatestAuditDashboardSource(
  folderKey: string
): Promise<AuditDashboardSource | null> {
  const sessions = await listFolderReportSessions(folderKey);
  const auditSessions = sessions.filter((item) => item.source === "audit");
  const auditSession = auditSessions[0];
  if (!auditSession) {
    return null;
  }
  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId: auditSession.sessionId },
    select: {
      sessionId: true,
      createdAt: true,
      auditReport: true,
      answers: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!row || row.auditReport === null) {
    return null;
  }

  const screeningStep2Data = await _loadScreeningStep2ForFolder(folderKey);

  const previousSession = auditSessions[1] ?? null;
  let previous: {
    sessionId: string;
    sessionLabel: string;
    answers: unknown;
    auditReport: unknown;
  } | null = null;
  if (previousSession) {
    const prevRow = await prisma.auditSubmission.findUnique({
      where: { sessionId: previousSession.sessionId },
      select: { sessionId: true, answers: true, auditReport: true },
    });
    if (prevRow) {
      previous = {
        sessionId: prevRow.sessionId,
        sessionLabel: previousSession.label,
        answers: prevRow.answers,
        auditReport: prevRow.auditReport,
      };
    }
  }

  return {
    sessionId: row.sessionId,
    sessionLabel: auditSession.label,
    createdAt: row.createdAt.toISOString(),
    auditReport: row.auditReport,
    answers: row.answers,
    screeningStep2Data,
    previous: previous,
  };
}

/**
 * Проверяет, что сессия отчёта принадлежит папке сотрудника.
 */
export async function assertFolderReportSession(
  folderKey: string,
  source: FolderReportSource,
  sessionId: string
): Promise<boolean> {
  const sessions = await listFolderReportSessions(folderKey);
  return sessions.some((item) => item.sessionId === sessionId && item.source === source);
}

async function _loadScreeningStep2ForFolder(folderKey: string): Promise<unknown | null> {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (parsed === null || parsed.kind !== "candidate") {
    return null;
  }
  const row = await prisma.screeningSubmission.findFirst({
    where: {
      candidateFolderKey: folderKey,
    },
    orderBy: { createdAt: "desc" },
    select: { step2Data: true },
  });
  return row?.step2Data ?? null;
}

async function _listCandidateScreeningSessions(
  folderKey: string
): Promise<FolderReportSessionRef[]> {
  const rows = await prisma.screeningSubmission.findMany({
    where: {
      candidateFolderKey: folderKey,
    },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      profileName: true,
      kotReport: true,
    },
  });
  return rows
    .filter((row) => row.kotReport !== null)
    .map((row) => ({
      sessionId: row.sessionId,
      source: "screening",
      label: `${row.profileName} — ${formatMoscowDateTime(row.createdAt)}`,
      createdAt: row.createdAt.toISOString(),
    }));
}

async function _listCandidateAuditSessions(
  folderKey: string
): Promise<FolderReportSessionRef[]> {
  const byFolderKey = await prisma.auditSubmission.findMany({
    where: {
      candidateFolderKey: folderKey,
      auditReport: { not: Prisma.JsonNull },
    },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      firstName: true,
      lastName: true,
    },
  });
  if (byFolderKey.length > 0) {
    return byFolderKey.map((row) => _mapAuditSession(row));
  }

  const assesseeKeys = await _resolveCandidateAssesseeKeys(folderKey);
  if (assesseeKeys.length === 0) {
    return [];
  }

  const byAssessee = await prisma.auditSubmission.findMany({
    where: {
      assesseeKey: { in: [...assesseeKeys] },
      auditReport: { not: Prisma.JsonNull },
    },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      firstName: true,
      lastName: true,
    },
  });
  return byAssessee.map((row) => _mapAuditSession(row));
}

async function _listAssesseeAuditSessions(assesseeKey: string): Promise<FolderReportSessionRef[]> {
  const rows = await prisma.auditSubmission.findMany({
    where: {
      assesseeKey,
    },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      auditReport: true,
    },
  });

  return rows
    .filter((row) => row.auditReport !== null)
    .map((row) => _mapAuditSession(row));
}

function _mapAuditSession(row: {
  sessionId: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
}): FolderReportSessionRef {
  return {
    sessionId: row.sessionId,
    source: "audit",
    label: `${row.lastName} ${row.firstName} — ${formatMoscowDateTime(row.createdAt)}`,
    createdAt: row.createdAt.toISOString(),
  };
}

async function _resolveCandidateAssesseeKeys(folderKey: string): Promise<ReadonlyArray<string>> {
  const invites = await prisma.accessInvite.findMany({
    where: {
      candidateFolderKey: folderKey,
      usedAt: { not: null },
      candidateLastName: { not: null },
      candidateFirstName: { not: null },
    },
    select: {
      candidateLastName: true,
      candidateFirstName: true,
    },
  });

  const keys = new Set<string>();
  for (const invite of invites) {
    const assessee = buildAuditAssesseeKey({
      lastName: invite.candidateLastName ?? "",
      firstName: invite.candidateFirstName ?? "",
    });
    if (assessee !== null) {
      keys.add(assessee.key);
    }
  }
  return [...keys];
}
