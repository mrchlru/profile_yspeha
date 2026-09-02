export type CommissionFixedScaleQuestion = {
  id: string;
  text: string;
};

/** Десять фиксированных шкальных вопросов оценочного листа (1–10). */
export const COMMISSION_FIXED_SCALE_QUESTIONS: ReadonlyArray<CommissionFixedScaleQuestion> = [
  { id: "q01", text: "Внешний вид кандидата" },
  { id: "q02", text: "Коммуникабельность и контакт" },
  { id: "q03", text: "Уверенность в себе" },
  { id: "q04", text: "Мотивация к работе в компании" },
  { id: "q05", text: "Профессиональная компетентность" },
  { id: "q06", text: "Логика и структурность ответов" },
  { id: "q07", text: "Стрессоустойчивость" },
  { id: "q08", text: "Готовность к обучению и развитию" },
  { id: "q09", text: "Соответствие корпоративной культуре" },
  { id: "q10", text: "Общая рекомендация к найму (шкала)" },
];

export const COMMISSION_SCALE_MIN = 1;
export const COMMISSION_SCALE_MAX = 10;

export const COMMISSION_VARIABLE_QUESTION_COUNT = 2;

export const COMMISSION_EVAL_STATUS_DRAFT = "draft" as const;
export const COMMISSION_EVAL_STATUS_SUBMITTED = "submitted" as const;

export type CommissionEvalStatus =
  | typeof COMMISSION_EVAL_STATUS_DRAFT
  | typeof COMMISSION_EVAL_STATUS_SUBMITTED;

export type CommissionScaleAnswers = Record<string, number>;

export type CommissionVariableAnswer = {
  questionText: string;
  conclusion: string;
};

export type CommissionMemberLabel = {
  memberId: string;
  label: string;
  lastName: string;
  firstName: string;
};

/**
 * Формирует подпись участника: «Фамилия И.»
 */
export function formatCommissionMemberLabel(
  lastName: string,
  firstName: string
): string {
  const initial = firstName.trim().charAt(0);
  return initial ? `${lastName.trim()} ${initial}.` : lastName.trim();
}
