import type { CommissionVariableAnswer } from "@/lib/commission/commissionEvalConstants";

/**
 * Нормализует текст вопроса для сравнения (без учёта регистра и лишних пробелов).
 */
export function normalizeCommissionQuestionText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Извлекает тексты переменных вопросов из JSON-поля листа.
 */
export function extractVariableQuestionTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const texts: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || !("questionText" in item)) {
      continue;
    }
    const text = String((item as { questionText: unknown }).questionText ?? "").trim();
    if (text.length >= 5) {
      texts.push(text);
    }
  }
  return texts;
}

/**
 * Проверяет, совпадает ли текст с уже занятым вопросом.
 */
export function isCommissionQuestionTextReserved(
  text: string,
  reserved: ReadonlyArray<string>
): boolean {
  const key = normalizeCommissionQuestionText(text);
  if (!key) {
    return false;
  }
  return reserved.some((item) => normalizeCommissionQuestionText(item) === key);
}

/**
 * Убирает из банка вопросы, уже выбранные другими участниками.
 */
export function filterAvailableCommissionBankQuestions(
  bank: ReadonlyArray<{ id: string; text: string }>,
  reserved: ReadonlyArray<string>
): { id: string; text: string }[] {
  return bank.filter((item) => !isCommissionQuestionTextReserved(item.text, reserved));
}

/**
 * Проверяет, что в анкете нет повторов и занятых вопросов.
 */
export function validateCommissionVariableQuestionsAvailability(
  answers: ReadonlyArray<CommissionVariableAnswer>,
  reserved: ReadonlyArray<string>
): string | null {
  const normalizedKeys: string[] = [];

  for (const item of answers) {
    const text = item.questionText.trim();
    if (text.length === 0) {
      continue;
    }
    if (isCommissionQuestionTextReserved(text, reserved)) {
      return `Вопрос «${text}» уже использован другим участником комиссии. Выберите другой из банка или сформулируйте свой.`;
    }
    normalizedKeys.push(normalizeCommissionQuestionText(text));
  }

  if (new Set(normalizedKeys).size !== normalizedKeys.length) {
    return "Два вопроса в анкете не должны совпадать.";
  }

  return null;
}

/**
 * Склоняет «вопрос» по числу: 1 вопрос, 2 вопроса, 5 вопросов.
 */
export function formatRussianQuestionCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return `${String(count)} вопросов`;
  }
  if (mod10 === 1) {
    return `${String(count)} вопрос`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${String(count)} вопроса`;
  }
  return `${String(count)} вопросов`;
}
