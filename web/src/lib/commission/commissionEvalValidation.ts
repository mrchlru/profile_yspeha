import {
  COMMISSION_FIXED_SCALE_QUESTIONS,
  COMMISSION_SCALE_MAX,
  COMMISSION_SCALE_MIN,
  COMMISSION_VARIABLE_QUESTION_COUNT,
  type CommissionScaleAnswers,
  type CommissionVariableAnswer,
} from "@/lib/commission/commissionEvalConstants";

/**
 * Проверяет шкальные ответы (10 вопросов, значения 1–10).
 */
export function validateCommissionScaleAnswers(
  answers: CommissionScaleAnswers
): string | null {
  for (const question of COMMISSION_FIXED_SCALE_QUESTIONS) {
    const value = answers[question.id];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < COMMISSION_SCALE_MIN ||
      value > COMMISSION_SCALE_MAX
    ) {
      return `Укажите оценку от ${String(COMMISSION_SCALE_MIN)} до ${String(COMMISSION_SCALE_MAX)} для вопроса «${question.text}».`;
    }
  }
  return null;
}

/**
 * Проверяет развёрнутые ответы на переменные вопросы.
 */
export function validateCommissionVariableAnswers(
  answers: ReadonlyArray<CommissionVariableAnswer>
): string | null {
  if (answers.length !== COMMISSION_VARIABLE_QUESTION_COUNT) {
    return `Нужно заполнить ${String(COMMISSION_VARIABLE_QUESTION_COUNT)} переменных вопроса.`;
  }
  for (const item of answers) {
    if (item.questionText.trim().length < 5) {
      return "Текст вопроса слишком короткий.";
    }
    if (item.conclusion.trim().length < 10) {
      return "Заключение по вопросу слишком короткое.";
    }
  }
  return null;
}

/**
 * Считает среднее по шкале с учётом числа ответивших членов комиссии.
 */
export function averageCommissionScaleScore(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
