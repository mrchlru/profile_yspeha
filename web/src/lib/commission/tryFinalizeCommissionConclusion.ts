import type { Prisma } from "@/generated/prisma/client";

import { getInterviewFolderByKey } from "@/lib/admin/interviewFolders";
import { listInterviewCommissionMembers } from "@/lib/admin/interviewCommissionMembers";
import {
  buildCommissionAggregateReport,
  mapSubmittedSheetsForAggregate,
  renderCommissionAggregateHtml,
} from "@/lib/commission/buildCommissionAggregateReport";
import {
  COMMISSION_EVAL_STATUS_SUBMITTED,
} from "@/lib/commission/commissionEvalConstants";
import { generateCommissionAiConclusion } from "@/lib/commission/generateCommissionAiConclusion";
import { prisma } from "@/lib/prisma";

/**
 * Если все участники комиссии отправили анкеты — формирует «Заключение комиссии».
 */
export async function tryFinalizeCommissionConclusion(input: {
  interviewFolderKey: string;
  candidateFolderKey: string;
}): Promise<boolean> {
  const members = await listInterviewCommissionMembers(input.interviewFolderKey);
  if (members.length === 0) {
    return false;
  }

  const submittedSheets = await prisma.commissionEvalSheet.findMany({
    where: {
      interviewFolderKey: input.interviewFolderKey,
      candidateFolderKey: input.candidateFolderKey,
      status: COMMISSION_EVAL_STATUS_SUBMITTED,
    },
  });

  if (submittedSheets.length < members.length) {
    return false;
  }

  const memberMap = new Map(members.map((member) => [member.id, member]));
  const aggregateRows = mapSubmittedSheetsForAggregate(
    submittedSheets.map((sheet) => {
      const member = memberMap.get(sheet.memberId);
      return {
        memberId: sheet.memberId,
        memberLastName: member?.lastName ?? "",
        memberFirstName: member?.firstName ?? "",
        scaleAnswers: sheet.scaleAnswers,
        variableAnswers: sheet.variableAnswers,
      };
    })
  );

  const folder = await getInterviewFolderByKey(input.interviewFolderKey);
  const candidateName = await _resolveCandidateName(input.candidateFolderKey);
  const { reportData } = buildCommissionAggregateReport({
    candidateName,
    vacancyTitle: folder?.displayName ?? input.interviewFolderKey,
    sheets: aggregateRows,
  });

  const aiConclusion = await generateCommissionAiConclusion(reportData);
  const finalHtml = renderCommissionAggregateHtml(reportData, aiConclusion);

  await prisma.commissionCandidateConclusion.upsert({
    where: { candidateFolderKey: input.candidateFolderKey },
    create: {
      interviewFolderKey: input.interviewFolderKey,
      candidateFolderKey: input.candidateFolderKey,
      reportHtml: finalHtml,
      reportData: reportData as unknown as Prisma.InputJsonValue,
      aiConclusion,
    },
    update: {
      reportHtml: finalHtml,
      reportData: reportData as unknown as Prisma.InputJsonValue,
      aiConclusion,
    },
  });

  return true;
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
    return [invite.candidateLastName, invite.candidateFirstName, invite.candidateMiddleName]
      .filter(Boolean)
      .join(" ");
  }
  return candidateFolderKey;
}
