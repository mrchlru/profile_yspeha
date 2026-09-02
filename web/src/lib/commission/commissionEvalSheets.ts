import type { Prisma } from "@/generated/prisma/client";

import { listCommissionQuestions } from "@/lib/admin/commission/commissionQuestionStore";
import { listInterviewCommissionMembers } from "@/lib/admin/interviewCommissionMembers";
import { getInterviewFolderByKey } from "@/lib/admin/interviewFolders";
import { listEmployeeFolderFiles } from "@/lib/admin/folderFiles";
import {
  buildCommissionEvalSheetUrl,
  generateCommissionEvalAccessToken,
} from "@/lib/commission/commissionEvalAccess";
import {
  COMMISSION_EVAL_STATUS_DRAFT,
  COMMISSION_EVAL_STATUS_SUBMITTED,
  COMMISSION_FIXED_SCALE_QUESTIONS,
  formatCommissionMemberLabel,
  type CommissionScaleAnswers,
  type CommissionVariableAnswer,
} from "@/lib/commission/commissionEvalConstants";
import {
  validateCommissionScaleAnswers,
  validateCommissionVariableAnswers,
} from "@/lib/commission/commissionEvalValidation";
import {
  filterAvailableCommissionBankQuestions,
  validateCommissionVariableQuestionsAvailability,
} from "@/lib/commission/commissionQuestionTextUtils";
import { listReservedCommissionQuestionTexts } from "@/lib/commission/commissionReservedQuestions";
import {
  ensureCustomCommissionQuestionsAllowed,
  persistCustomCommissionQuestions,
} from "@/lib/commission/persistCustomCommissionQuestions";
import { tryFinalizeCommissionConclusion } from "@/lib/commission/tryFinalizeCommissionConclusion";
import { sendCommissionEvalEmail } from "@/lib/email/sendCommissionEvalEmail";
import { prisma } from "@/lib/prisma";

export type CommissionEvalSheetPublicView = {
  accessToken: string;
  status: string;
  candidateName: string;
  vacancyTitle: string;
  memberName: string;
  fixedQuestions: typeof COMMISSION_FIXED_SCALE_QUESTIONS;
  lockedVariableQuestions: ReadonlyArray<string> | null;
  scaleAnswers: CommissionScaleAnswers | null;
  variableAnswers: ReadonlyArray<CommissionVariableAnswer> | null;
  bankQuestions: ReadonlyArray<{ id: string; text: string }>;
  /** Вопросы, уже занятые другими участниками комиссии по этому кандидату. */
  reservedQuestionTexts: ReadonlyArray<string>;
  resumeFiles: ReadonlyArray<{ id: string; fileName: string; viewUrl: string }>;
  submittedAt: string | null;
};

export type CommissionCandidateEvalStatus = {
  candidateFolderKey: string;
  totalMembers: number;
  sheetsCreated: number;
  submittedCount: number;
  emailsSent: number;
  conclusionReady: boolean;
  conclusionViewUrl: string | null;
};

/**
 * Создаёт листы и отправляет письма всем участникам комиссии по кандидату.
 */
export async function dispatchCommissionEvalSheets(input: {
  interviewFolderKey: string;
  candidateFolderKey: string;
  candidateName: string;
  positionLevel?: string | null;
  /** Повторно отправить письма участникам, которым ссылка уже высылалась. */
  resendEmails?: boolean;
}): Promise<CommissionCandidateEvalStatus> {
  const folder = await getInterviewFolderByKey(input.interviewFolderKey);
  if (!folder) {
    throw new Error("Папка вакансии не найдена.");
  }

  const members = await listInterviewCommissionMembers(input.interviewFolderKey);
  if (members.length === 0) {
    throw new Error("Сначала добавьте участников комиссии.");
  }

  for (const member of members) {
    const existing = await prisma.commissionEvalSheet.findUnique({
      where: {
        memberId_candidateFolderKey: {
          memberId: member.id,
          candidateFolderKey: input.candidateFolderKey,
        },
      },
    });

    let sheet = existing;
    if (!sheet) {
      sheet = await prisma.commissionEvalSheet.create({
        data: {
          accessToken: generateCommissionEvalAccessToken(),
          interviewFolderKey: input.interviewFolderKey,
          candidateFolderKey: input.candidateFolderKey,
          memberId: member.id,
          status: COMMISSION_EVAL_STATUS_DRAFT,
        },
      });
    }

    const shouldSendEmail = !sheet.emailSentAt || input.resendEmails === true;
    if (shouldSendEmail) {
      const url = buildCommissionEvalSheetUrl(sheet.accessToken);
      const sent = await sendCommissionEvalEmail({
        to: member.email,
        memberName: member.displayName,
        candidateName: input.candidateName,
        vacancyTitle: folder.displayName,
        evalUrl: url,
      });
      if (sent) {
        await prisma.commissionEvalSheet.update({
          where: { id: sheet.id },
          data: { emailSentAt: new Date() },
        });
      }
    }
  }

  return getCommissionCandidateEvalStatus(input.interviewFolderKey, input.candidateFolderKey);
}

/**
 * Возвращает статус анкет комиссии по кандидату.
 */
export async function getCommissionCandidateEvalStatus(
  interviewFolderKey: string,
  candidateFolderKey: string
): Promise<CommissionCandidateEvalStatus> {
  const members = await listInterviewCommissionMembers(interviewFolderKey);
  if (members.length === 0) {
    await prisma.commissionEvalSheet.deleteMany({
      where: { interviewFolderKey, candidateFolderKey },
    });
    await prisma.commissionCandidateConclusion.deleteMany({
      where: { candidateFolderKey },
    });
    return {
      candidateFolderKey,
      totalMembers: 0,
      sheetsCreated: 0,
      submittedCount: 0,
      emailsSent: 0,
      conclusionReady: false,
      conclusionViewUrl: null,
    };
  }

  const memberIds = new Set(members.map((member) => member.id));
  const allSheets = await prisma.commissionEvalSheet.findMany({
    where: { interviewFolderKey, candidateFolderKey },
  });
  const sheets = allSheets.filter((sheet) => memberIds.has(sheet.memberId));
  const conclusion = await prisma.commissionCandidateConclusion.findUnique({
    where: { candidateFolderKey },
  });

  return {
    candidateFolderKey,
    totalMembers: members.length,
    sheetsCreated: sheets.length,
    submittedCount: sheets.filter((row) => row.status === COMMISSION_EVAL_STATUS_SUBMITTED).length,
    emailsSent: sheets.filter((row) => row.emailSentAt !== null).length,
    conclusionReady: members.length > 0 && conclusion !== null,
    conclusionViewUrl: conclusion
      ? `/api/commission/conclusion?candidateFolderKey=${encodeURIComponent(candidateFolderKey)}`
      : null,
  };
}

/**
 * Загружает публичное представление оценочного листа по токену.
 */
export async function loadCommissionEvalSheetByToken(
  accessToken: string
): Promise<CommissionEvalSheetPublicView | null> {
  const sheet = await prisma.commissionEvalSheet.findUnique({
    where: { accessToken },
  });
  if (!sheet) {
    return null;
  }

  const [member, folder, questionSet, bankItems, files, reservedQuestionTexts] =
    await Promise.all([
    prisma.interviewCommissionMember.findUnique({ where: { id: sheet.memberId } }),
    getInterviewFolderByKey(sheet.interviewFolderKey),
    prisma.commissionMemberQuestionSet.findUnique({ where: { memberId: sheet.memberId } }),
    listCommissionQuestions({ includeInactive: false }),
    listEmployeeFolderFiles(sheet.candidateFolderKey),
    listReservedCommissionQuestionTexts(
      sheet.interviewFolderKey,
      sheet.candidateFolderKey,
      sheet.memberId
    ),
  ]);

  if (!member || !folder) {
    return null;
  }

  const candidateName = await _resolveCandidateName(sheet.candidateFolderKey);
  const resumeFiles = files
    .filter((file) => file.category === "pdf" || file.category === "word")
    .map((file) => ({
      id: file.id,
      fileName: file.fileName,
      viewUrl: `/api/commission/eval/${encodeURIComponent(accessToken)}/resume/${encodeURIComponent(file.id)}`,
    }));

  const bankQuestions = filterAvailableCommissionBankQuestions(
    bankItems.slice(0, 80).map((item) => ({ id: item.id, text: item.text })),
    reservedQuestionTexts
  );

  return {
    accessToken: sheet.accessToken,
    status: sheet.status,
    candidateName,
    vacancyTitle: folder.displayName,
    memberName: formatCommissionMemberLabel(member.lastName, member.firstName),
    fixedQuestions: COMMISSION_FIXED_SCALE_QUESTIONS,
    lockedVariableQuestions: questionSet
      ? [questionSet.question1Text, questionSet.question2Text]
      : null,
    scaleAnswers: (sheet.scaleAnswers as CommissionScaleAnswers | null) ?? null,
    variableAnswers: (sheet.variableAnswers as CommissionVariableAnswer[] | null) ?? null,
    bankQuestions,
    reservedQuestionTexts,
    resumeFiles,
    submittedAt: sheet.submittedAt?.toISOString() ?? null,
  };
}

/**
 * Сохраняет черновик или отправляет оценочный лист.
 */
export async function saveCommissionEvalSheet(input: {
  accessToken: string;
  scaleAnswers: CommissionScaleAnswers;
  variableAnswers: ReadonlyArray<CommissionVariableAnswer>;
  submit: boolean;
  createdByEmail?: string | null;
}): Promise<{ submitted: boolean }> {
  const sheet = await prisma.commissionEvalSheet.findUnique({
    where: { accessToken: input.accessToken },
  });
  if (!sheet) {
    throw new Error("Оценочный лист не найден.");
  }
  if (sheet.status === COMMISSION_EVAL_STATUS_SUBMITTED) {
    throw new Error("Анкета уже отправлена и не может быть изменена.");
  }

  const folder = await getInterviewFolderByKey(sheet.interviewFolderKey);
  if (!folder) {
    throw new Error("Папка вакансии не найдена.");
  }
  const positionTitle = folder.positionTitle;

  const scaleError = validateCommissionScaleAnswers(input.scaleAnswers);
  if (scaleError) {
    throw new Error(scaleError);
  }

  const reservedQuestionTexts = await listReservedCommissionQuestionTexts(
    sheet.interviewFolderKey,
    sheet.candidateFolderKey,
    sheet.memberId
  );

  if (input.submit) {
    const questionSet = await prisma.commissionMemberQuestionSet.findUnique({
      where: { memberId: sheet.memberId },
    });
    const variableAnswers = questionSet
      ? [
          {
            questionText: questionSet.question1Text,
            conclusion: input.variableAnswers[0]?.conclusion?.trim() ?? "",
          },
          {
            questionText: questionSet.question2Text,
            conclusion: input.variableAnswers[1]?.conclusion?.trim() ?? "",
          },
        ]
      : input.variableAnswers;

    const reservedError = validateCommissionVariableQuestionsAvailability(
      variableAnswers,
      reservedQuestionTexts
    );
    if (reservedError) {
      throw new Error(reservedError);
    }

    await ensureCustomCommissionQuestionsAllowed(variableAnswers, positionTitle);

    const variableError = validateCommissionVariableAnswers(variableAnswers);
    if (variableError) {
      throw new Error(variableError);
    }

    await persistCustomCommissionQuestions(
      variableAnswers,
      positionTitle,
      input.createdByEmail
    );
    await _lockMemberVariableQuestions(
      sheet.memberId,
      sheet.interviewFolderKey,
      variableAnswers
    );

    await prisma.commissionEvalSheet.update({
      where: { id: sheet.id },
      data: {
        scaleAnswers: input.scaleAnswers as Prisma.InputJsonValue,
        variableAnswers: variableAnswers as Prisma.InputJsonValue,
        status: COMMISSION_EVAL_STATUS_SUBMITTED,
        submittedAt: new Date(),
      },
    });

    await tryFinalizeCommissionConclusion({
      interviewFolderKey: sheet.interviewFolderKey,
      candidateFolderKey: sheet.candidateFolderKey,
    });
    return { submitted: true };
  }

  const reservedDraftError = validateCommissionVariableQuestionsAvailability(
    input.variableAnswers,
    reservedQuestionTexts
  );
  if (reservedDraftError) {
    throw new Error(reservedDraftError);
  }

  await ensureCustomCommissionQuestionsAllowed(input.variableAnswers, positionTitle);

  await prisma.commissionEvalSheet.update({
    where: { id: sheet.id },
    data: {
      scaleAnswers: input.scaleAnswers as Prisma.InputJsonValue,
      variableAnswers: input.variableAnswers as Prisma.InputJsonValue,
      status: COMMISSION_EVAL_STATUS_DRAFT,
      submittedAt: null,
    },
  });

  return { submitted: false };
}

async function _lockMemberVariableQuestions(
  memberId: string,
  interviewFolderKey: string,
  answers: ReadonlyArray<CommissionVariableAnswer>
): Promise<void> {
  const existing = await prisma.commissionMemberQuestionSet.findUnique({
    where: { memberId },
  });
  if (existing) {
    return;
  }

  const [q1, q2] = answers;
  await prisma.commissionMemberQuestionSet.create({
    data: {
      memberId,
      interviewFolderKey,
      question1Text: q1.questionText.trim(),
      question2Text: q2.questionText.trim(),
    },
  });
}

async function _resolveCandidateName(candidateFolderKey: string): Promise<string> {
  const invite = await prisma.accessInvite.findFirst({
    where: { candidateFolderKey },
    orderBy: { createdAt: "desc" },
    select: {
      candidateLastName: true,
      candidateFirstName: true,
      candidateMiddleName: true,
    },
  });
  if (invite?.candidateLastName && invite.candidateFirstName) {
    const parts = [
      invite.candidateLastName,
      invite.candidateFirstName,
      invite.candidateMiddleName,
    ].filter(Boolean);
    return parts.join(" ");
  }
  return candidateFolderKey;
}
