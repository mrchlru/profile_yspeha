import type { SurveySchemaDocument, SurveyQuestionType } from "@/lib/survey/surveyTypes";

const NON_QUESTION_TYPES: ReadonlySet<SurveyQuestionType> = new Set([
  "title_block",
  "image_block",
  "video_block",
  "section",
]);

/**
 * Считает число вопросов (без служебных блоков) в схеме.
 */
export function countSurveyQuestions(schema: SurveySchemaDocument): number {
  return schema.questions.filter((q) => !NON_QUESTION_TYPES.has(q.type)).length;
}
