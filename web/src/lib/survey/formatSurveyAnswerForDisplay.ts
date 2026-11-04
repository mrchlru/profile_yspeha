import type { SurveyQuestion, SurveySchemaDocument } from "@/lib/survey/surveyTypes";

function optionLabel(question: SurveyQuestion, optionId: string): string {
  if (!("options" in question) || !question.options?.length) {
    return optionId;
  }
  const opt = question.options.find((o) => o.id === optionId);
  return opt?.label ?? optionId;
}

/**
 * Превращает сохранённое значение ответа в текст для админки.
 */
export function formatSurveyAnswerForDisplay(
  question: SurveyQuestion,
  value: unknown
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (question.type === "multiple_choice" && Array.isArray(value)) {
    if (value.length === 0) {
      return "—";
    }
    return value.map((id) => optionLabel(question, String(id))).join(", ");
  }

  if (
    question.type === "single_choice" ||
    question.type === "dropdown"
  ) {
    return optionLabel(question, String(value));
  }

  if (question.type === "rating" || question.type === "linear_scale") {
    return String(value);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

/**
 * Карта questionId → вопрос из схемы.
 */
export function surveyQuestionsById(
  schema: SurveySchemaDocument
): Map<string, SurveyQuestion> {
  return new Map(schema.questions.map((q) => [q.id, q]));
}
