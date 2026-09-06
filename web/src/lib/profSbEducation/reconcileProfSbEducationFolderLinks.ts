import { Prisma } from "@/generated/prisma/client";

import {
  buildCandidateFolderKey,
  parseCandidateBirthDate,
} from "@/lib/admin/buildCandidateFolderKey";
import {
  applyCandidateFolderLifecycle,
  ensureCandidateFolderRecord,
} from "@/lib/admin/candidateFolderLifecycle";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { TEST_KIND_PROF_SB_EDUCATION } from "@/lib/access/testKinds";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";
import type { ProfSbEducationReportJson } from "@/lib/profSbEducation/profSbEducationTypes";

/**
 * Восстанавливает `candidateFolderKey` у прохождений/приглашений ПРОФ,
 * чтобы они попадали в «Результаты тестирования».
 *
 * Возвращает число обновлённых submission-строк.
 */
export async function reconcileProfSbEducationFolderLinks(): Promise<number> {
  const [orphanSubs, orphanInvites] = await Promise.all([
    prisma.profSbEducationSubmission.findMany({
      where: { candidateFolderKey: null },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        accessInviteCode: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.accessInvite.findMany({
      where: {
        testKind: TEST_KIND_PROF_SB_EDUCATION,
        candidateFolderKey: null,
        candidateLastName: { not: null },
        candidateFirstName: { not: null },
        candidateBirthDate: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        code: true,
        candidateLastName: true,
        candidateFirstName: true,
        candidateMiddleName: true,
        candidateBirthDate: true,
      },
    }),
  ]);

  let fixedSubmissions = 0;

  for (const invite of orphanInvites) {
    const folderKey = await _ensureFolderKeyForInviteIdentity({
      lastName: invite.candidateLastName!,
      firstName: invite.candidateFirstName!,
      middleName: invite.candidateMiddleName,
      birthDate: invite.candidateBirthDate!,
    });
    if (!folderKey) {
      continue;
    }
    await prisma.accessInvite.update({
      where: { id: invite.id },
      data: { candidateFolderKey: folderKey },
    });
  }

  for (const row of orphanSubs) {
    const folderKey = await resolveProfSbEducationFolderKey({
      accessInviteCode: row.accessInviteCode,
      firstName: row.firstName,
      lastName: row.lastName,
    });
    if (!folderKey) {
      continue;
    }
    await prisma.profSbEducationSubmission.update({
      where: { id: row.id },
      data: { candidateFolderKey: folderKey },
    });
    fixedSubmissions += 1;
  }

  await _backfillStubProfReports();

  return fixedSubmissions;
}

/**
 * Для старых заглушечных прохождений без step4 — просто статус computed (без текста «методика»).
 */
async function _backfillStubProfReports(): Promise<void> {
  const rows = await prisma.profSbEducationSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, answers: true, profReport: true },
  });

  for (const row of rows) {
    const report = row.profReport as ProfSbEducationReportJson | null;
    if (report?.status === "computed") {
      continue;
    }
    const nextReport: ProfSbEducationReportJson = {
      status: "computed",
      sections: ["profSb", "profEducation"],
      computedAt: formatMoscowNow(),
      interpretation: report?.interpretation ?? null,
    };
    await prisma.profSbEducationSubmission.update({
      where: { id: row.id },
      data: { profReport: nextReport as unknown as Prisma.InputJsonValue },
    });
  }
}

/**
 * Определяет folderKey для ПРОФ: из invite, либо строит из ФИО/даты рождения invite.
 */
export async function resolveProfSbEducationFolderKey(input: {
  accessInviteCode: string | null | undefined;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<string | null> {
  const code = input.accessInviteCode
    ? normalizeAccessCode(input.accessInviteCode)
    : "";
  if (!code) {
    return null;
  }

  const invite = await prisma.accessInvite.findFirst({
    where: { code },
    select: {
      id: true,
      candidateFolderKey: true,
      candidateLastName: true,
      candidateFirstName: true,
      candidateMiddleName: true,
      candidateBirthDate: true,
    },
  });
  if (!invite) {
    return null;
  }

  if (invite.candidateFolderKey) {
    return invite.candidateFolderKey;
  }

  const lastName = invite.candidateLastName ?? input.lastName ?? null;
  const firstName = invite.candidateFirstName ?? input.firstName ?? null;
  const birthDate = invite.candidateBirthDate;
  if (!lastName || !firstName || !birthDate) {
    return null;
  }

  const folderKey = await _ensureFolderKeyForInviteIdentity({
    lastName,
    firstName,
    middleName: invite.candidateMiddleName,
    birthDate,
  });
  if (!folderKey) {
    return null;
  }

  await prisma.accessInvite.update({
    where: { id: invite.id },
    data: { candidateFolderKey: folderKey },
  });
  return folderKey;
}

async function _ensureFolderKeyForInviteIdentity(input: {
  lastName: string;
  firstName: string;
  middleName: string | null;
  birthDate: Date;
}): Promise<string | null> {
  const built = buildCandidateFolderKey({
    lastName: input.lastName,
    firstName: input.firstName,
    middleName: input.middleName,
    birthDate: input.birthDate,
  });
  if (!built) {
    return null;
  }

  const birthDate = parseCandidateBirthDate(built.birthDateIso) ?? input.birthDate;
  await ensureCandidateFolderRecord({
    folderKey: built.key,
    lastName: built.lastNameDisplay,
    firstName: built.firstNameDisplay,
    middleName: built.middleNameDisplay,
    birthDate,
  });
  try {
    await applyCandidateFolderLifecycle(built.key, "hire");
  } catch {
    /* уже ACTIVE — ок */
  }
  return built.key;
}
