import type { CommissionVariableAnswer } from "@/lib/commission/commissionEvalConstants";

/** Категория сбоя сохранения анкеты комиссии. */
export type CommissionEvalFailureKind =
  | "ai_filter"
  | "ai_classify"
  | "validation"
  | "reserved_question"
  | "unknown";

/** Сообщение для участника комиссии без деталей причины. */
export const COMMISSION_EVAL_PUBLIC_SAVE_ERROR =
  "Не удалось сохранить анкету. Обратитесь к организатору собеседования.";

/**
 * Ошибка сохранения анкеты комиссии с метаданными для админ-лога.
 */
export class CommissionEvalSaveError extends Error {
  readonly failureKind: CommissionEvalFailureKind;
  readonly questionText: string | null;

  constructor(input: {
    message: string;
    failureKind: CommissionEvalFailureKind;
    questionText?: string | null;
  }) {
    super(input.message);
    this.name = "CommissionEvalSaveError";
    this.failureKind = input.failureKind;
    this.questionText = input.questionText ?? null;
  }
}

/**
 * Определяет категорию сбоя по исключению.
 */
export function resolveCommissionEvalFailureKind(error: unknown): CommissionEvalFailureKind {
  if (error instanceof CommissionEvalSaveError) {
    return error.failureKind;
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("уже использован")) {
    return "reserved_question";
  }
  if (message.includes("не должны совпадать") || message.includes("заполните")) {
    return "validation";
  }
  if (
    message.includes("OpenAI") ||
    message.includes("модел") ||
    message.includes("проверк") ||
    message.includes("ИИ")
  ) {
    return "ai_filter";
  }
  return "unknown";
}

/**
 * Извлекает текст вопроса для записи в лог.
 */
export function resolveCommissionEvalFailureQuestionText(
  error: unknown,
  variableAnswers: ReadonlyArray<CommissionVariableAnswer>
): string | null {
  if (error instanceof CommissionEvalSaveError && error.questionText) {
    return error.questionText;
  }
  const message = error instanceof Error ? error.message : "";
  const quoted = message.match(/«([^»]+)»/);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }
  for (const answer of variableAnswers) {
    const text = answer.questionText.trim();
    if (text.length >= 5) {
      return text;
    }
  }
  return null;
}
