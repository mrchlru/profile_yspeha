import type { ReportExportTestKind } from "@/lib/admin/reportExportKinds";
import { inferAuditReportProfileFromStored } from "@/lib/admin/inferAuditReportProfileFromStored";
import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

export type RawAnswersRecord = {
  sessionId: string;
  lastName: string;
  firstName: string;
  completedAt: string;
  completedAtDate: Date;
  folderKey: string | null;
  testKind: ReportExportTestKind;
  answers: Record<string, unknown>;
};

/**
 * Загружает сырые ответы из БД по списку sessionId.
 */
export async function fetchRawAnswersRecords(
  testKind: ReportExportTestKind,
  sessionIds: ReadonlyArray<string>
): Promise<RawAnswersRecord[]> {
  const ids = [...new Set(sessionIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return [];
  }

  if (testKind === "screening") {
    return _fetchScreening(ids);
  }
  if (testKind === "audit_middle" || testKind === "audit_senior") {
    return _fetchAudit(testKind, ids);
  }
  if (testKind === "burnout") {
    return _fetchBurnout(ids);
  }
  return _fetchProfSbEducation(ids);
}

async function _fetchScreening(sessionIds: string[]): Promise<RawAnswersRecord[]> {
  const rows = await prisma.screeningSubmission.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      sessionId: true,
      profileName: true,
      createdAt: true,
      candidateFolderKey: true,
      accessInviteCode: true,
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
    },
  });

  const folderKeys = rows
    .map((row) => row.candidateFolderKey)
    .filter((key): key is string => !!key);
  const folders =
    folderKeys.length > 0
      ? await prisma.candidateFolderRecord.findMany({
          where: { folderKey: { in: folderKeys } },
          select: { folderKey: true, lastName: true, firstName: true },
        })
      : [];
  const folderByKey = new Map(folders.map((row) => [row.folderKey, row]));

  return rows.map((row) => {
    const folder = row.candidateFolderKey ? folderByKey.get(row.candidateFolderKey) : undefined;
    const { lastName, firstName } = folder
      ? { lastName: folder.lastName, firstName: folder.firstName }
      : _splitProfileName(row.profileName);

    return {
      sessionId: row.sessionId,
      lastName,
      firstName,
      completedAt: formatMoscowDateTime(row.createdAt),
      completedAtDate: row.createdAt,
      folderKey: row.candidateFolderKey,
      testKind: "screening",
      answers: {
        accessInviteCode: row.accessInviteCode ?? "",
        step1: row.step1Data,
        step2: row.step2Data,
        step3: row.step3Data,
        step4: row.step4Data,
      },
    };
  });
}

async function _fetchAudit(
  testKind: ReportExportTestKind,
  sessionIds: string[]
): Promise<RawAnswersRecord[]> {
  const targetProfile = _auditProfileForKind(testKind);
  if (!targetProfile) {
    return [];
  }

  const rows = await prisma.auditSubmission.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      sessionId: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
      answers: true,
      auditReport: true,
    },
  });

  return rows
    .filter((row) => {
      const report = parseStoredAuditReportJson(row.auditReport);
      if (!report) {
        return true;
      }
      return inferAuditReportProfileFromStored(report) === targetProfile;
    })
    .map((row) => ({
      sessionId: row.sessionId,
      lastName: row.lastName,
      firstName: row.firstName,
      completedAt: formatMoscowDateTime(row.createdAt),
      completedAtDate: row.createdAt,
      folderKey: row.candidateFolderKey,
      testKind,
      answers: {
        assesseeKey: row.assesseeKey,
        steps: row.answers,
      },
    }));
}

async function _fetchBurnout(sessionIds: string[]): Promise<RawAnswersRecord[]> {
  const rows = await prisma.burnoutSubmission.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      sessionId: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
      accessInviteCode: true,
      answers: true,
    },
  });

  return rows.map((row) => ({
    sessionId: row.sessionId,
    lastName: row.lastName,
    firstName: row.firstName,
    completedAt: formatMoscowDateTime(row.createdAt),
    completedAtDate: row.createdAt,
    folderKey: row.candidateFolderKey,
    testKind: "burnout",
    answers: {
      assesseeKey: row.assesseeKey,
      accessInviteCode: row.accessInviteCode ?? "",
      maslach: row.answers,
    },
  }));
}

async function _fetchProfSbEducation(sessionIds: string[]): Promise<RawAnswersRecord[]> {
  const rows = await prisma.profSbEducationSubmission.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      sessionId: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
      accessInviteCode: true,
      answers: true,
    },
  });

  return rows.map((row) => ({
    sessionId: row.sessionId,
    lastName: row.lastName,
    firstName: row.firstName,
    completedAt: formatMoscowDateTime(row.createdAt),
    completedAtDate: row.createdAt,
    folderKey: row.candidateFolderKey,
    testKind: "prof_sb_education",
    answers: {
      assesseeKey: row.assesseeKey,
      accessInviteCode: row.accessInviteCode ?? "",
      ...(typeof row.answers === "object" && row.answers !== null
        ? (row.answers as Record<string, unknown>)
        : { raw: row.answers }),
    },
  }));
}

function _auditProfileForKind(testKind: ReportExportTestKind): AuditReportProfile | null {
  if (testKind === "audit_middle") {
    return "od_reserve";
  }
  if (testKind === "audit_senior") {
    return "tu_management_chef";
  }
  return null;
}

function _splitProfileName(profileName: string): { lastName: string; firstName: string } {
  const parts = profileName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { lastName: "Неизвестно", firstName: "—" };
  }
  if (parts.length === 1) {
    return { lastName: parts[0] ?? "Неизвестно", firstName: "—" };
  }
  return { lastName: parts[0] ?? "Неизвестно", firstName: parts[1] ?? "—" };
}
