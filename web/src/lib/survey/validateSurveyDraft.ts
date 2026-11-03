import { countSurveyQuestions } from "@/lib/survey/countSurveyQuestions";
import type { SurveyMode, SurveySchemaDocument, SurveySettingsDocument } from "@/lib/survey/surveyTypes";

export type SurveyDraftValidationIssue = {
  code: string;
  message: string;
  questionId?: string;
};

export type SurveyDraftValidationResult =
  | { ok: true }
  | { ok: false; issues: SurveyDraftValidationIssue[] };

const QUESTION_TYPES_WITH_BODY = new Set([
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "linear_scale",
  "rating",
  "grid_single",
  "grid_checkbox",
  "date",
  "time",
  "file_upload",
]);

/**
 * Проверяет черновик перед публикацией (MVP: обязательные поля и ключи теста).
 */
export function validateSurveyDraft(input: {
  mode: SurveyMode;
  schema: SurveySchemaDocument;
  settings: SurveySettingsDocument;
}): SurveyDraftValidationResult {
  const issues: SurveyDraftValidationIssue[] = [];
  const title = input.schema.title.trim();
  if (!title) {
    issues.push({ code: "title_empty", message: "Укажите название опроса." });
  }

  const questionCount = countSurveyQuestions(input.schema);
  if (questionCount < 1) {
    issues.push({
      code: "no_questions",
      message: "Добавьте хотя бы один вопрос или блок.",
    });
  }

  for (const question of input.schema.questions) {
    if (!QUESTION_TYPES_WITH_BODY.has(question.type)) {
      continue;
    }
    if (!question.title.trim()) {
      issues.push({
        code: "question_title_empty",
        message: `Заполните текст вопроса ${question.code}.`,
        questionId: question.id,
      });
    }
    if (
      input.mode === "test" &&
      (question.type === "single_choice" ||
        question.type === "multiple_choice" ||
        question.type === "dropdown")
    ) {
      const withKey = question.correctOptionIds ?? [];
      if (withKey.length === 0) {
        issues.push({
          code: "test_key_missing",
          message: `Для теста отметьте правильный ответ в ${question.code}.`,
          questionId: question.id,
        });
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true };
}
