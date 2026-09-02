import type { CommissionVariableAnswer } from "@/lib/commission/commissionEvalConstants";
import { CommissionEvalSaveError } from "@/lib/commission/commissionEvalSaveErrors";
import { classifyCommissionQuestionsWithAi } from "@/lib/admin/commission/classifyCommissionQuestions";
import { createCommissionQuestion } from "@/lib/admin/commission/commissionQuestionStore";
import { filterCommissionMemberQuestionsWithAi } from "@/lib/commission/filterCommissionMemberQuestions";
import { prisma } from "@/lib/prisma";

/**
 * Возвращает тексты пользовательских вопросов, которых ещё нет в банке.
 */
export async function listCustomCommissionQuestionTexts(
  answers: ReadonlyArray<CommissionVariableAnswer>
): Promise<string[]> {
  const customTexts: string[] = [];

  for (const answer of answers) {
    const text = answer.questionText.trim();
    if (text.length < 5) {
      continue;
    }
    const existing = await prisma.commissionQuestion.findFirst({
      where: { text, active: true },
      select: { id: true },
    });
    if (!existing) {
      customTexts.push(text);
    }
  }

  return customTexts;
}

/**
 * Проверяет пользовательские вопросы через ИИ по должности вакансии.
 */
export async function ensureCustomCommissionQuestionsAllowed(
  answers: ReadonlyArray<CommissionVariableAnswer>,
  positionTitle: string
): Promise<void> {
  const customTexts = await listCustomCommissionQuestionTexts(answers);
  if (customTexts.length === 0) {
    return;
  }

  const results = await filterCommissionMemberQuestionsWithAi({
    questions: customTexts,
    positionTitle,
  });

  for (const result of results) {
    if (!result.allowed) {
      const reason =
        result.reason ??
        `Вопрос «${result.text}» не подходит для должности «${positionTitle}».`;
      throw new CommissionEvalSaveError({
        message: reason,
        failureKind: "ai_filter",
        questionText: result.text,
      });
    }
  }
}

/**
 * Добавляет новые пользовательские вопросы в банк с ИИ-классификацией.
 */
export async function persistCustomCommissionQuestions(
  answers: ReadonlyArray<CommissionVariableAnswer>,
  positionTitle: string,
  createdByEmail: string | null | undefined
): Promise<void> {
  const customTexts = await listCustomCommissionQuestionTexts(answers);
  if (customTexts.length === 0) {
    return;
  }

  const classified = await classifyCommissionQuestionsWithAi({
    questions: customTexts,
    contextPositionTitle: positionTitle,
  });

  for (const draft of classified) {
    const duplicate = await prisma.commissionQuestion.findFirst({
      where: { text: draft.text, active: true },
      select: { id: true },
    });
    if (duplicate) {
      continue;
    }

    await createCommissionQuestion({
      text: draft.text,
      category: draft.category,
      positionLevels: draft.positionLevels,
      specialties: draft.specialties,
      aiSuggested: true,
      createdBy: createdByEmail ?? "commission_member",
    });
  }
}
