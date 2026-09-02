import type { Prisma } from "@/generated/prisma/client";

import {
  commissionQuestionCategoryLabel,
  commissionSpecialtyLabel,
  type CommissionQuestionCategoryId,
  type CommissionQuestionRecord,
  isCommissionQuestionCategory,
  normalizeCommissionPositionLevels,
  normalizeCommissionSpecialties,
} from "@/lib/admin/commission/commissionQuestionTypes";
import { candidatePositionLevelLabel } from "@/lib/admin/candidatePositionLevels";
import { prisma } from "@/lib/prisma";

export type CommissionQuestionListFilters = {
  positionLevel?: string;
  specialty?: string;
  category?: string;
  includeInactive?: boolean;
};

export type CreateCommissionQuestionInput = {
  text: string;
  category: CommissionQuestionCategoryId;
  positionLevels: ReadonlyArray<string>;
  specialties: ReadonlyArray<string>;
  aiSuggested?: boolean;
  createdBy?: string | null;
};

export type UpdateCommissionQuestionInput = {
  text?: string;
  category?: CommissionQuestionCategoryId;
  positionLevels?: ReadonlyArray<string>;
  specialties?: ReadonlyArray<string>;
  active?: boolean;
  sortOrder?: number;
};

/**
 * Возвращает вопросы комиссии с фильтрацией по уровню, специальности и категории.
 */
export async function listCommissionQuestions(
  filters: CommissionQuestionListFilters = {}
): Promise<CommissionQuestionRecord[]> {
  const where: Prisma.CommissionQuestionWhereInput = {};

  if (!filters.includeInactive) {
    where.active = true;
  }
  if (filters.category && isCommissionQuestionCategory(filters.category)) {
    where.category = filters.category;
  }
  if (filters.positionLevel) {
    where.positionLevels = { has: filters.positionLevel };
  }
  if (filters.specialty) {
    where.specialties = { has: filters.specialty };
  }

  const rows = await prisma.commissionQuestion.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map(_toRecord);
}

/**
 * Создаёт один вопрос комиссии.
 */
export async function createCommissionQuestion(
  input: CreateCommissionQuestionInput
): Promise<CommissionQuestionRecord> {
  const text = input.text.trim();
  if (text.length < 8) {
    throw new Error("Текст вопроса слишком короткий.");
  }
  if (!isCommissionQuestionCategory(input.category)) {
    throw new Error("Некорректная категория вопроса.");
  }

  const row = await prisma.commissionQuestion.create({
    data: {
      text,
      category: input.category,
      positionLevels: normalizeCommissionPositionLevels(input.positionLevels),
      specialties: normalizeCommissionSpecialties(input.specialties),
      aiSuggested: input.aiSuggested ?? false,
      createdBy: input.createdBy ?? null,
    },
  });

  return _toRecord(row);
}

/**
 * Создаёт несколько вопросов за один запрос.
 */
export async function createCommissionQuestionsBatch(
  items: ReadonlyArray<CreateCommissionQuestionInput>
): Promise<CommissionQuestionRecord[]> {
  const created: CommissionQuestionRecord[] = [];
  for (const item of items) {
    created.push(await createCommissionQuestion(item));
  }
  return created;
}

/**
 * Обновляет вопрос комиссии.
 */
export async function updateCommissionQuestion(
  questionId: string,
  patch: UpdateCommissionQuestionInput
): Promise<CommissionQuestionRecord> {
  const data: Prisma.CommissionQuestionUpdateInput = {};

  if (patch.text !== undefined) {
    const text = patch.text.trim();
    if (text.length < 8) {
      throw new Error("Текст вопроса слишком короткий.");
    }
    data.text = text;
  }
  if (patch.category !== undefined) {
    if (!isCommissionQuestionCategory(patch.category)) {
      throw new Error("Некорректная категория вопроса.");
    }
    data.category = patch.category;
  }
  if (patch.positionLevels !== undefined) {
    data.positionLevels = normalizeCommissionPositionLevels(patch.positionLevels);
  }
  if (patch.specialties !== undefined) {
    data.specialties = normalizeCommissionSpecialties(patch.specialties);
  }
  if (patch.active !== undefined) {
    data.active = patch.active;
  }
  if (patch.sortOrder !== undefined) {
    data.sortOrder = patch.sortOrder;
  }

  try {
    const row = await prisma.commissionQuestion.update({
      where: { id: questionId },
      data,
    });
    return _toRecord(row);
  } catch {
    throw new Error("Вопрос не найден.");
  }
}

/**
 * Удаляет вопрос комиссии.
 */
export async function deleteCommissionQuestion(questionId: string): Promise<void> {
  try {
    await prisma.commissionQuestion.delete({ where: { id: questionId } });
  } catch {
    throw new Error("Вопрос не найден.");
  }
}

function _toRecord(row: {
  id: string;
  text: string;
  category: string;
  positionLevels: string[];
  specialties: string[];
  sortOrder: number;
  active: boolean;
  aiSuggested: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CommissionQuestionRecord {
  const category = isCommissionQuestionCategory(row.category) ? row.category : "other";
  return {
    id: row.id,
    text: row.text,
    category,
    categoryLabel: commissionQuestionCategoryLabel(category),
    positionLevels: row.positionLevels,
    positionLevelLabels: row.positionLevels.map((value) => candidatePositionLevelLabel(value)),
    specialties: row.specialties,
    specialtyLabels: row.specialties.map((value) => commissionSpecialtyLabel(value)),
    sortOrder: row.sortOrder,
    active: row.active,
    aiSuggested: row.aiSuggested,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
