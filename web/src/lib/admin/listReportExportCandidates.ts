import { Prisma } from "@/generated/prisma/client";

import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";
import { inferAuditReportProfileFromStored } from "@/lib/admin/inferAuditReportProfileFromStored";
import type {
  ReportExportCandidate,
  ReportExportTestKind,
} from "@/lib/admin/reportExportKinds";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import { prisma } from "@/lib/prisma";

function _auditProfileForExportKind(testKind: ReportExportTestKind): AuditReportProfile | null {
  if (testKind === "audit_middle") {
    return "od_reserve";
  }
  if (testKind === "audit_senior") {
    return "tu_management_chef";
  }
  return null;
}

/**
 * Список людей с последним прохождением выбранного типа теста (для выбора в выгрузке).
 */
export async function listReportExportCandidates(
  testKind: ReportExportTestKind
): Promise<ReportExportCandidate[]> {
  if (testKind === "screening") {
    return _listScreeningCandidates();
  }
  if (testKind === "audit_middle" || testKind === "audit_senior") {
    return _listAuditCandidates(testKind);
  }
  if (testKind === "burnout") {
    return _listBurnoutCandidates();
  }
  return _listProfSbEducationCandidates();
}

async function _listScreeningCandidates(): Promise<ReportExportCandidate[]> {
  const rows = await prisma.screeningSubmission.findMany({
    where: { kotReport: { not: Prisma.DbNull } },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      profileName: true,
      candidateFolderKey: true,
      createdAt: true,
    },
  });

  const folderKeys = [
    ...new Set(rows.map((row) => row.candidateFolderKey).filter((key): key is string => !!key)),
  ];
  const folderRecords =
    folderKeys.length > 0
      ? await prisma.candidateFolderRecord.findMany({
          where: { folderKey: { in: folderKeys } },
          select: { folderKey: true, lastName: true, firstName: true },
        })
      : [];
  const folderByKey = new Map(folderRecords.map((row) => [row.folderKey, row]));

  const seen = new Set<string>();
  const out: ReportExportCandidate[] = [];

  for (const row of rows) {
    const dedupeKey = row.candidateFolderKey ?? `profile:${row.profileName.trim().toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const folder = row.candidateFolderKey
      ? folderByKey.get(row.candidateFolderKey)
      : undefined;
    const { lastName, firstName } = folder
      ? { lastName: folder.lastName, firstName: folder.firstName }
      : _splitProfileName(row.profileName);

    out.push({
      sessionId: row.sessionId,
      folderKey: row.candidateFolderKey,
      lastName,
      firstName,
      displayName: `${lastName} ${firstName}`.trim(),
      completedAt: row.createdAt.toISOString(),
    });
  }

  return out;
}

async function _listAuditCandidates(
  testKind: ReportExportTestKind
): Promise<ReportExportCandidate[]> {
  const targetProfile = _auditProfileForExportKind(testKind);
  if (!targetProfile) {
    return [];
  }

  const rows = await prisma.auditSubmission.findMany({
    where: { auditReport: { not: Prisma.DbNull } },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      auditReport: true,
      candidateFolderKey: true,
    },
  });

  const seen = new Set<string>();
  const out: ReportExportCandidate[] = [];

  for (const row of rows) {
    if (seen.has(row.assesseeKey)) {
      continue;
    }
    const report = parseStoredAuditReportJson(row.auditReport);
    if (!report) {
      continue;
    }
    const profile = inferAuditReportProfileFromStored(report);
    if (profile !== targetProfile) {
      continue;
    }
    seen.add(row.assesseeKey);

    const folderKey = row.candidateFolderKey ?? `audit:${row.assesseeKey}`;
    out.push({
      sessionId: row.sessionId,
      folderKey,
      lastName: row.lastName,
      firstName: row.firstName,
      displayName: `${row.lastName} ${row.firstName}`.trim(),
      completedAt: row.createdAt.toISOString(),
    });
  }

  return out;
}

async function _listBurnoutCandidates(): Promise<ReportExportCandidate[]> {
  const rows = await prisma.burnoutSubmission.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
      burnoutReport: true,
    },
  });

  const seen = new Set<string>();
  const out: ReportExportCandidate[] = [];

  for (const row of rows) {
    if (seen.has(row.assesseeKey)) {
      continue;
    }
    if (!row.burnoutReport) {
      continue;
    }
    seen.add(row.assesseeKey);
    out.push({
      sessionId: row.sessionId,
      folderKey: row.candidateFolderKey,
      lastName: row.lastName,
      firstName: row.firstName,
      displayName: `${row.lastName} ${row.firstName}`.trim(),
      completedAt: row.createdAt.toISOString(),
    });
  }

  return out;
}

async function _listProfSbEducationCandidates(): Promise<ReportExportCandidate[]> {
  const rows = await prisma.profSbEducationSubmission.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
    },
  });

  const seen = new Set<string>();
  const out: ReportExportCandidate[] = [];

  for (const row of rows) {
    if (seen.has(row.assesseeKey)) {
      continue;
    }
    seen.add(row.assesseeKey);
    out.push({
      sessionId: row.sessionId,
      folderKey: row.candidateFolderKey,
      lastName: row.lastName,
      firstName: row.firstName,
      displayName: `${row.lastName} ${row.firstName}`.trim(),
      completedAt: row.createdAt.toISOString(),
    });
  }

  return out;
}

function _splitProfileName(profileName: string): { lastName: string; firstName: string } {
  const parts = profileName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { lastName: "Неизвестно", firstName: "Неизвестно" };
  }
  if (parts.length === 1) {
    return { lastName: parts[0] ?? "Неизвестно", firstName: "—" };
  }
  return { lastName: parts[0] ?? "Неизвестно", firstName: parts[1] ?? "—" };
}

/**
 * Последние sessionId по ключам папок для выбранного типа теста.
 */
export async function resolveReportExportSessionsByFolderKeys(
  testKind: ReportExportTestKind,
  folderKeys: ReadonlyArray<string>
): Promise<ReportExportCandidate[]> {
  const keySet = new Set(folderKeys.map((key) => key.trim()).filter(Boolean));
  if (keySet.size === 0) {
    return [];
  }
  const all = await listReportExportCandidates(testKind);
  return all.filter((item) => item.folderKey !== null && keySet.has(item.folderKey));
}
