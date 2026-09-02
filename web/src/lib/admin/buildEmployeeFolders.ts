import {
  EMPLOYEE_DOCUMENT_SLOTS,
  type EmployeeFolderDetail,
  type EmployeeFolderSummary,
} from "@/lib/admin/employeeFolderTypes";
import { parseCandidateBirthDate } from "@/lib/admin/buildCandidateFolderKey";
import {
  CANDIDATE_LIFECYCLE_ARCHIVED,
  CANDIDATE_LIFECYCLE_INTERVIEW,
  type CandidateFolderRecordSummary,
  type CandidateLifecycleStatus,
} from "@/lib/admin/candidateFolderTypes";
import {
  folderVisibleInResults,
  loadCandidateFolderStatusMap,
} from "@/lib/admin/candidateFolderLifecycle";
import { loadFolderArchiveMarkSet } from "@/lib/admin/folderArchiveMark";
import { candidatePositionLevelLabel } from "@/lib/admin/candidatePositionLevels";
import {
  buildCandidateDisplayName,
  matchesCandidateSearch,
  type CandidateSearchRecord,
} from "@/lib/admin/candidateSearch";
import { loadEmployeeFolderDataItems } from "@/lib/admin/loadEmployeeFolderDataItems";
import { listFolderBurnoutSessions } from "@/lib/admin/folderBurnoutSessions";
import { listFolderProfSbEducationSessions } from "@/lib/admin/folderProfSbEducationSessions";
import {
  listFolderReportSessions,
  loadLatestAuditDashboardSource,
  loadLatestAuditReportJsonForFolder,
} from "@/lib/admin/folderReportSessions";
import { listEmployeeFolderFiles } from "@/lib/admin/folderFiles";
import {
  buildEmployeeDashboardPreview,
  parseStoredAuditReportJson,
} from "@/lib/admin/buildEmployeeDashboardPreview";
import { buildEmployeeDashboardVisual } from "@/lib/admin/buildEmployeeDashboardVisual";
import { parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { folderHasProctorReport } from "@/lib/proctor/buildProctorViolationsReport";
import { prisma } from "@/lib/prisma";

export type EmployeeFolderTypeFilter = "all" | "screening" | "audit";

type FolderAccumulator = {
  key: string;
  displayName: string;
  hasScreening: boolean;
  hasAudit: boolean;
  hasInterview: boolean;
  lastActivityAt: Date | null;
  screeningSessions: number;
  auditSessions: number;
  hasShortReport: boolean;
  hasFullReport: boolean;
  positionLevel: string | null;
  birthDate: Date | null;
  pendingInvite: boolean;
  lastName: string | null;
  firstName: string | null;
  middleName: string | null;
  inviteCode: string | null;
  lifecycleStatus: CandidateLifecycleStatus | null;
};

function _upsertFolder(
  map: Map<string, FolderAccumulator>,
  key: string,
  displayName: string,
  patch: Partial<FolderAccumulator>
): void {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      key,
      displayName,
      hasScreening: false,
      hasAudit: false,
      hasInterview: false,
      lastActivityAt: null,
      screeningSessions: 0,
      auditSessions: 0,
      hasShortReport: false,
      hasFullReport: false,
      positionLevel: null,
      birthDate: null,
      pendingInvite: false,
      lastName: null,
      firstName: null,
      middleName: null,
      inviteCode: null,
      lifecycleStatus: null,
      ...patch,
    });
    return;
  }

  map.set(key, {
    ...existing,
    displayName: patch.displayName?.trim() ? patch.displayName : existing.displayName,
    hasScreening: existing.hasScreening || Boolean(patch.hasScreening),
    hasAudit: existing.hasAudit || Boolean(patch.hasAudit),
    hasInterview: existing.hasInterview || Boolean(patch.hasInterview),
    screeningSessions: existing.screeningSessions + (patch.screeningSessions ?? 0),
    auditSessions: existing.auditSessions + (patch.auditSessions ?? 0),
    hasShortReport: existing.hasShortReport || Boolean(patch.hasShortReport),
    hasFullReport: existing.hasFullReport || Boolean(patch.hasFullReport),
    positionLevel: patch.positionLevel ?? existing.positionLevel,
    birthDate: patch.birthDate ?? existing.birthDate,
    pendingInvite: existing.pendingInvite || Boolean(patch.pendingInvite),
    lastName: patch.lastName ?? existing.lastName,
    firstName: patch.firstName ?? existing.firstName,
    middleName: patch.middleName ?? existing.middleName,
    inviteCode: patch.inviteCode ?? existing.inviteCode,
    lastActivityAt:
      patch.lastActivityAt &&
      (!existing.lastActivityAt || patch.lastActivityAt > existing.lastActivityAt)
        ? patch.lastActivityAt
        : existing.lastActivityAt,
  });
}

function _toSummary(
  row: FolderAccumulator,
  lifecycleStatus: CandidateLifecycleStatus | null,
  isArchiveMarked: boolean
): EmployeeFolderSummary {
  const isArchived = row.key.startsWith("candidate:")
    ? lifecycleStatus === CANDIDATE_LIFECYCLE_ARCHIVED
    : isArchiveMarked;
  return {
    key: row.key,
    displayName: row.displayName,
    lastName: row.lastName,
    firstName: row.firstName,
    hasScreening: row.hasScreening,
    hasAudit: row.hasAudit,
    hasInterview: row.hasInterview,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    screeningSessions: row.screeningSessions,
    auditSessions: row.auditSessions,
    positionLevel: row.positionLevel,
    positionLevelLabel: row.positionLevel
      ? candidatePositionLevelLabel(row.positionLevel)
      : null,
    birthDate: row.birthDate?.toISOString().slice(0, 10) ?? null,
    pendingInvite: row.pendingInvite,
    middleName: row.middleName,
    lifecycleStatus,
    isArchived,
  };
}

/**
 * Дополняет папку кандидата ФИО и датой из CandidateFolderRecord или из ключа папки.
 */
function _enrichFolderFromCandidateRecord(
  row: FolderAccumulator,
  record: CandidateFolderRecordSummary | undefined
): FolderAccumulator {
  if (!row.key.startsWith("candidate:")) {
    return row;
  }

  let next: FolderAccumulator = { ...row };

  if (record) {
    const recordBirth = parseCandidateBirthDate(record.birthDate);
    next = {
      ...next,
      lastName: next.lastName ?? record.lastName,
      firstName: next.firstName ?? record.firstName,
      middleName: next.middleName ?? record.middleName,
      birthDate: next.birthDate ?? recordBirth,
      displayName:
        !next.displayName.trim() || next.displayName === next.key
          ? record.displayName
          : next.displayName,
    };
  }

  if (!next.birthDate) {
    const birthFromKey = _parseBirthDateFromCandidateFolderKey(next.key);
    if (birthFromKey) {
      next.birthDate = birthFromKey;
    }
  }

  return next;
}

function _parseBirthDateFromCandidateFolderKey(key: string): Date | null {
  const match = /^candidate:[^:]+:[^:]+:(\d{4}-\d{2}-\d{2})$/.exec(key);
  if (!match) {
    return null;
  }
  return parseCandidateBirthDate(match[1]);
}

function _folderSearchRecord(row: FolderAccumulator): CandidateSearchRecord {
  return {
    code: row.inviteCode,
    lastName: row.lastName,
    firstName: row.firstName,
    middleName: row.middleName,
    birthDate: row.birthDate,
    positionLevel: row.positionLevel,
    positionLevelLabel: row.positionLevel
      ? candidatePositionLevelLabel(row.positionLevel)
      : null,
    displayName: row.displayName,
  };
}

function _matchesTypeFilter(row: FolderAccumulator, typeFilter: EmployeeFolderTypeFilter): boolean {
  if (typeFilter === "screening") {
    return row.hasScreening || row.pendingInvite || row.key.startsWith("candidate:");
  }
  if (typeFilter === "audit") {
    return row.hasAudit;
  }
  return true;
}

/**
 * Собирает список папок соискателей и сотрудников.
 */
export async function listEmployeeFolders(
  query?: string,
  typeFilter: EmployeeFolderTypeFilter = "all",
  archiveView = false,
  includeAllStatuses = false
): Promise<EmployeeFolderSummary[]> {
  const [inviteRows, screeningRows, auditRows] = await Promise.all([
    prisma.accessInvite.findMany({
      where: {
        testKind: TEST_KIND_SCREENING,
        candidateFolderKey: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        code: true,
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
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        createdAt: true,
        kotReport: true,
        candidateFolderKey: true,
        accessInviteCode: true,
      },
    }),
    prisma.auditSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        assesseeKey: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        auditReport: true,
        candidateFolderKey: true,
      },
    }),
  ]);

  const map = new Map<string, FolderAccumulator>();

  for (const row of inviteRows) {
    const key = row.candidateFolderKey;
    if (!key || !row.candidateLastName || !row.candidateFirstName) {
      continue;
    }
    const displayName = buildCandidateDisplayName({
      lastName: row.candidateLastName,
      firstName: row.candidateFirstName,
      middleName: row.candidateMiddleName,
      birthDate: row.candidateBirthDate,
    });
    _upsertFolder(map, key, displayName, {
      pendingInvite: row.usedAt === null,
      lastActivityAt: row.createdAt,
      positionLevel: row.candidatePositionLevel,
      birthDate: row.candidateBirthDate,
      lastName: row.candidateLastName,
      firstName: row.candidateFirstName,
      middleName: row.candidateMiddleName,
      inviteCode: row.code,
    });
  }

  for (const row of screeningRows) {
    if (!row.candidateFolderKey) {
      continue;
    }
    _upsertFolder(map, row.candidateFolderKey, row.candidateFolderKey, {
      hasScreening: true,
      screeningSessions: 1,
      lastActivityAt: row.createdAt,
      hasShortReport: row.kotReport !== null,
      hasFullReport: row.kotReport !== null,
      pendingInvite: false,
      inviteCode: row.accessInviteCode,
    });
  }

  for (const row of auditRows) {
    const hasReport = row.auditReport !== null;

    if (row.candidateFolderKey) {
      const linkedDisplayName = `${row.lastName} ${row.firstName}`.trim();
      _upsertFolder(map, row.candidateFolderKey, linkedDisplayName || row.candidateFolderKey, {
        hasAudit: true,
        auditSessions: 1,
        lastActivityAt: row.createdAt,
        hasShortReport: hasReport,
        hasFullReport: hasReport,
        pendingInvite: false,
        lastName: row.lastName,
        firstName: row.firstName,
      });
    }

    const displayName = `${row.lastName} ${row.firstName}`.trim();
    const key = `audit:${row.assesseeKey}`;
    _upsertFolder(map, key, displayName, {
      hasAudit: true,
      auditSessions: 1,
      lastActivityAt: row.createdAt,
      hasShortReport: hasReport,
      hasFullReport: hasReport,
      lastName: row.lastName,
      firstName: row.firstName,
    });
  }

  const searchQuery = query?.trim() ?? "";
  const folderKeys = [...map.keys()];
  const [statusMap, archiveMarkSet] = await Promise.all([
    loadCandidateFolderStatusMap(folderKeys),
    loadFolderArchiveMarkSet(folderKeys),
  ]);

  const items = [...map.values()]
    .map((row) => _enrichFolderFromCandidateRecord(row, statusMap.get(row.key)))
    .filter((row) => _matchesTypeFilter(row, typeFilter))
    .filter((row) => matchesCandidateSearch(searchQuery, _folderSearchRecord(row)))
    .filter((row) => {
      if (includeAllStatuses) {
        return true;
      }
      const status =
        statusMap.get(row.key)?.lifecycleStatus ??
        (row.key.startsWith("candidate:") ? CANDIDATE_LIFECYCLE_INTERVIEW : null);
      const isArchiveMarked = archiveMarkSet.has(row.key);
      return folderVisibleInResults(row.key, status, isArchiveMarked, archiveView);
    })
    .map((row) => {
      const status =
        statusMap.get(row.key)?.lifecycleStatus ??
        (row.key.startsWith("candidate:") ? CANDIDATE_LIFECYCLE_INTERVIEW : null);
      return _toSummary(row, status, archiveMarkSet.has(row.key));
    })
    .sort((a, b) => {
      const aTime = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const bTime = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return bTime - aTime;
    });

  return items;
}

function _documentViewKind(
  slotId: (typeof EMPLOYEE_DOCUMENT_SLOTS)[number]["id"],
  available: boolean
): "pdf" | "html" | "none" {
  if (!available) {
    return "none";
  }
  if (slotId === "full_report" || slotId === "manager_report") {
    return "pdf";
  }
  if (slotId === "short_report" || slotId === "dashboard" || slotId === "violations_report") {
    return "html";
  }
  return "none";
}

/**
 * Собирает summary одной папки без полного пересчёта списка.
 */
export async function getEmployeeFolderSummaryByKey(
  folderKey: string
): Promise<EmployeeFolderSummary | null> {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (parsed === null) {
    return null;
  }

  const map = new Map<string, FolderAccumulator>();

  if (parsed.kind === "candidate") {
    const [inviteRows, screeningRows, auditRows] = await Promise.all([
      prisma.accessInvite.findMany({
        where: {
          testKind: TEST_KIND_SCREENING,
          candidateFolderKey: folderKey,
        },
        orderBy: { createdAt: "desc" },
        select: {
          code: true,
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
        where: { candidateFolderKey: folderKey },
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          kotReport: true,
          candidateFolderKey: true,
          accessInviteCode: true,
        },
      }),
      prisma.auditSubmission.findMany({
        where: { candidateFolderKey: folderKey },
        orderBy: { createdAt: "desc" },
        select: {
          firstName: true,
          lastName: true,
          createdAt: true,
          auditReport: true,
          candidateFolderKey: true,
        },
      }),
    ]);

    for (const row of inviteRows) {
      if (!row.candidateLastName || !row.candidateFirstName) {
        continue;
      }
      const displayName = buildCandidateDisplayName({
        lastName: row.candidateLastName,
        firstName: row.candidateFirstName,
        middleName: row.candidateMiddleName,
        birthDate: row.candidateBirthDate,
      });
      _upsertFolder(map, folderKey, displayName, {
        pendingInvite: row.usedAt === null,
        lastActivityAt: row.createdAt,
        positionLevel: row.candidatePositionLevel,
        birthDate: row.candidateBirthDate,
        lastName: row.candidateLastName,
        firstName: row.candidateFirstName,
        middleName: row.candidateMiddleName,
        inviteCode: row.code,
      });
    }

    for (const row of screeningRows) {
      _upsertFolder(map, folderKey, folderKey, {
        hasScreening: true,
        screeningSessions: 1,
        lastActivityAt: row.createdAt,
        hasShortReport: row.kotReport !== null,
        hasFullReport: row.kotReport !== null,
        pendingInvite: false,
        inviteCode: row.accessInviteCode,
      });
    }

    for (const row of auditRows) {
      const hasReport = row.auditReport !== null;
      const linkedDisplayName = `${row.lastName} ${row.firstName}`.trim();
      _upsertFolder(map, folderKey, linkedDisplayName || folderKey, {
        hasAudit: true,
        auditSessions: 1,
        lastActivityAt: row.createdAt,
        hasShortReport: hasReport,
        hasFullReport: hasReport,
        pendingInvite: false,
        lastName: row.lastName,
        firstName: row.firstName,
      });
    }
  } else {
    const auditRows = await prisma.auditSubmission.findMany({
      where: { assesseeKey: parsed.assesseeKey },
      orderBy: { createdAt: "desc" },
      select: {
        assesseeKey: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        auditReport: true,
      },
    });

    for (const row of auditRows) {
      const hasReport = row.auditReport !== null;
      const displayName = `${row.lastName} ${row.firstName}`.trim();
      _upsertFolder(map, folderKey, displayName, {
        hasAudit: true,
        auditSessions: 1,
        lastActivityAt: row.createdAt,
        hasShortReport: hasReport,
        hasFullReport: hasReport,
        lastName: row.lastName,
        firstName: row.firstName,
      });
    }
  }

  const acc = map.get(folderKey);
  if (acc === undefined) {
    return null;
  }

  const [statusMap, archiveMarkSet] = await Promise.all([
    loadCandidateFolderStatusMap([folderKey]),
    loadFolderArchiveMarkSet([folderKey]),
  ]);
  const enriched = _enrichFolderFromCandidateRecord(acc, statusMap.get(folderKey));
  const status =
    statusMap.get(folderKey)?.lifecycleStatus ??
    (folderKey.startsWith("candidate:") ? CANDIDATE_LIFECYCLE_INTERVIEW : null);
  return _toSummary(enriched, status, archiveMarkSet.has(folderKey));
}

/**
 * Возвращает детальную карточку папки сотрудника.
 */
export async function getEmployeeFolderDetail(
  folderKey: string
): Promise<EmployeeFolderDetail | null> {
  const summary = await getEmployeeFolderSummaryByKey(folderKey);
  if (!summary) {
    return null;
  }

  const hasScreeningAndInterview = summary.hasScreening && summary.hasInterview;
  const reportSessions = await listFolderReportSessions(folderKey);
  const burnoutSessions =
    summary.key.startsWith("candidate:")
      ? await listFolderBurnoutSessions(folderKey)
      : [];
  const profSbEducationSessions =
    summary.key.startsWith("candidate:")
      ? await listFolderProfSbEducationSessions(folderKey)
      : [];
  const hasScreeningReport = reportSessions.some((item) => item.source === "screening");
  const hasAuditReport = reportSessions.some((item) => item.source === "audit");
  const hasProctorReport = await folderHasProctorReport(folderKey);

  const documents = EMPLOYEE_DOCUMENT_SLOTS.map((slot) => {
    let available = false;

    switch (slot.id) {
      case "resume":
        available = hasScreeningAndInterview;
        break;
      case "short_report":
        available = hasScreeningReport || hasAuditReport;
        break;
      case "full_report":
        available = hasScreeningReport || hasAuditReport;
        break;
      case "manager_report":
        available = hasAuditReport;
        break;
      case "violations_report":
        available = hasProctorReport;
        break;
      case "commission_reports":
        available = hasScreeningAndInterview;
        break;
      case "dashboard":
        available = hasAuditReport;
        break;
    }

    return {
      id: slot.id,
      title: slot.title,
      description: slot.description,
      available,
      viewKind: _documentViewKind(slot.id, available),
    };
  }).filter((slot) => slot.available);

  const dataItems = await loadEmployeeFolderDataItems(folderKey);
  const uploadedFiles = await listEmployeeFolderFiles(folderKey);
  const storedAuditReport = await loadLatestAuditReportJsonForFolder(folderKey);
  const dashboardSource = await loadLatestAuditDashboardSource(folderKey);
  const dashboardPreview = buildEmployeeDashboardPreview(
    parseStoredAuditReportJson(storedAuditReport)
  );
  const dashboardVisual = buildEmployeeDashboardVisual(dashboardSource);

  return {
    ...summary,
    documents,
    dataItems,
    reportSessions,
    burnoutSessions,
    profSbEducationSessions,
    uploadedFiles,
    dashboardPreview,
    dashboardVisual,
  };
}
