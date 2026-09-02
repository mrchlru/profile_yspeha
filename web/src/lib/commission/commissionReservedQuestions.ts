import { prisma } from "@/lib/prisma";

import {
  extractVariableQuestionTexts,
  filterAvailableCommissionBankQuestions,
  isCommissionQuestionTextReserved,
  normalizeCommissionQuestionText,
  validateCommissionVariableQuestionsAvailability,
} from "@/lib/commission/commissionQuestionTextUtils";

export {
  extractVariableQuestionTexts,
  filterAvailableCommissionBankQuestions,
  isCommissionQuestionTextReserved,
  normalizeCommissionQuestionText,
  validateCommissionVariableQuestionsAvailability,
};

/**
 * Возвращает вопросы, уже занятые другими участниками комиссии по этому кандидату.
 */
export async function listReservedCommissionQuestionTexts(
  interviewFolderKey: string,
  candidateFolderKey: string,
  excludeMemberId: string
): Promise<ReadonlyArray<string>> {
  const otherSheets = await prisma.commissionEvalSheet.findMany({
    where: {
      interviewFolderKey,
      candidateFolderKey,
      memberId: { not: excludeMemberId },
    },
    select: { variableAnswers: true },
  });

  const byNormalized = new Map<string, string>();
  for (const row of otherSheets) {
    for (const text of extractVariableQuestionTexts(row.variableAnswers)) {
      const key = normalizeCommissionQuestionText(text);
      if (!byNormalized.has(key)) {
        byNormalized.set(key, text);
      }
    }
  }

  return [...byNormalized.values()];
}
