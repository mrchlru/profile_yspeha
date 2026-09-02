import { getInterviewFolderByKey } from "@/lib/admin/interviewFolders";
import {
  MAX_INTERVIEW_COMMISSION_MEMBERS,
  type InterviewCommissionMemberRecord,
} from "@/lib/admin/interviewCommissionTypes";
import { COMMISSION_EVAL_STATUS_SUBMITTED } from "@/lib/commission/commissionEvalConstants";
import { prisma } from "@/lib/prisma";

export type CreateInterviewCommissionMemberInput = {
  interviewFolderKey: string;
  firstName: string;
  lastName: string;
  email: string;
};

/**
 * Возвращает участников комиссии папки вакансии.
 */
export async function listInterviewCommissionMembers(
  interviewFolderKey: string
): Promise<InterviewCommissionMemberRecord[]> {
  const rows = await prisma.interviewCommissionMember.findMany({
    where: { interviewFolderKey },
    orderBy: [{ createdAt: "asc" }],
  });
  return rows.map(_toRecord);
}

/**
 * Добавляет участника комиссии (не более 4 на вакансию).
 */
export async function createInterviewCommissionMember(
  input: CreateInterviewCommissionMemberInput
): Promise<InterviewCommissionMemberRecord> {
  const folder = await getInterviewFolderByKey(input.interviewFolderKey);
  if (!folder) {
    throw new Error("Папка вакансии не найдена.");
  }

  const firstName = _normalizeName(input.firstName);
  const lastName = _normalizeName(input.lastName);
  const email = _normalizeEmail(input.email);

  if (firstName.length === 0 || lastName.length === 0) {
    throw new Error("Укажите имя и фамилию участника.");
  }
  if (!_isValidEmail(email)) {
    throw new Error("Укажите корректный адрес почты.");
  }

  const count = await prisma.interviewCommissionMember.count({
    where: { interviewFolderKey: input.interviewFolderKey },
  });
  if (count >= MAX_INTERVIEW_COMMISSION_MEMBERS) {
    throw new Error(`В комиссии не более ${String(MAX_INTERVIEW_COMMISSION_MEMBERS)} участников.`);
  }

  try {
    const row = await prisma.interviewCommissionMember.create({
      data: {
        interviewFolderKey: input.interviewFolderKey,
        firstName,
        lastName,
        email,
      },
    });
    return _toRecord(row);
  } catch {
    throw new Error("Участник с такой почтой уже добавлен в комиссию.");
  }
}

/**
 * Удаляет участника комиссии вместе с его оценочными листами и вопросами.
 */
export async function deleteInterviewCommissionMember(
  memberId: string,
  interviewFolderKey: string
): Promise<void> {
  const sheets = await prisma.commissionEvalSheet.findMany({
    where: { memberId, interviewFolderKey },
    select: { candidateFolderKey: true },
  });
  const affectedCandidates = [
    ...new Set(sheets.map((sheet) => sheet.candidateFolderKey)),
  ];

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.commissionEvalSheet.deleteMany({ where: { memberId } });
    await tx.commissionMemberQuestionSet.deleteMany({ where: { memberId } });
    const result = await tx.interviewCommissionMember.deleteMany({
      where: { id: memberId, interviewFolderKey },
    });
    return result.count;
  });

  if (deleted === 0) {
    throw new Error("Участник не найден.");
  }

  for (const candidateFolderKey of affectedCandidates) {
    await _reconcileCommissionConclusion(interviewFolderKey, candidateFolderKey);
  }
}

function _toRecord(row: {
  id: string;
  interviewFolderKey: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
}): InterviewCommissionMemberRecord {
  return {
    id: row.id,
    interviewFolderKey: row.interviewFolderKey,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    displayName: `${row.lastName} ${row.firstName}`,
    createdAt: row.createdAt.toISOString(),
  };
}

function _normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function _normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function _isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Удаляет заключение комиссии, если участников не осталось или анкеты ещё неполные.
 */
async function _reconcileCommissionConclusion(
  interviewFolderKey: string,
  candidateFolderKey: string
): Promise<void> {
  const members = await prisma.interviewCommissionMember.findMany({
    where: { interviewFolderKey },
    select: { id: true },
  });

  if (members.length === 0) {
    await prisma.commissionCandidateConclusion.deleteMany({
      where: { candidateFolderKey },
    });
    return;
  }

  const memberIds = members.map((member) => member.id);
  const submittedCount = await prisma.commissionEvalSheet.count({
    where: {
      interviewFolderKey,
      candidateFolderKey,
      memberId: { in: memberIds },
      status: COMMISSION_EVAL_STATUS_SUBMITTED,
    },
  });

  if (submittedCount < members.length) {
    await prisma.commissionCandidateConclusion.deleteMany({
      where: { candidateFolderKey },
    });
  }
}
