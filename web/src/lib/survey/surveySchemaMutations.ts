import { createSurveyQuestion } from "@/lib/survey/createSurveyQuestion";
import { countSurveyQuestions } from "@/lib/survey/countSurveyQuestions";
import type {
  SurveyQuestion,
  SurveyQuestionType,
  SurveySchemaDocument,
} from "@/lib/survey/surveyTypes";

/**
 * Меняет тип вопроса, сохраняя id, код и текст.
 */
export function replaceSurveyQuestionType(
  question: SurveyQuestion,
  newType: SurveyQuestionType,
  codeIndex: number
): SurveyQuestion {
  const fresh = createSurveyQuestion(newType, codeIndex);
  return {
    ...fresh,
    id: question.id,
    code: question.code,
    title: question.title,
    required: question.required,
    description: question.description,
  };
}

/**
 * Удаляет вопрос из схемы и из порядка разделов.
 */
export function removeQuestionFromSchema(
  schema: SurveySchemaDocument,
  questionId: string
): SurveySchemaDocument {
  return {
    ...schema,
    questions: schema.questions.filter((q) => q.id !== questionId),
    sections: schema.sections.map((section) => ({
      ...section,
      questionIds: section.questionIds.filter((id) => id !== questionId),
    })),
  };
}

/**
 * Дублирует вопрос сразу после исходного в первом разделе.
 */
export function duplicateQuestionInSchema(
  schema: SurveySchemaDocument,
  questionId: string
): SurveySchemaDocument {
  const source = schema.questions.find((q) => q.id === questionId);
  if (!source) {
    return schema;
  }
  const codeIndex = countSurveyQuestions(schema) + 1;
  const copy = createSurveyQuestion(source.type, codeIndex);
  const merged = {
    ...copy,
    title: source.title,
    required: source.required,
    description: source.description,
  } as SurveyQuestion;

  if (source.type === "single_choice" || source.type === "multiple_choice" || source.type === "dropdown") {
    if ("options" in source && "options" in merged) {
      merged.options = source.options.map((opt) => ({
        ...opt,
        id: crypto.randomUUID(),
      }));
      merged.correctOptionIds = [];
    }
  }

  const sectionIndex = 0;
  const section = schema.sections[sectionIndex];
  if (!section) {
    return schema;
  }
  const order = [...section.questionIds];
  const at = order.indexOf(questionId);
  if (at >= 0) {
    order.splice(at + 1, 0, merged.id);
  } else {
    order.push(merged.id);
  }
  const sections = schema.sections.map((s, i) =>
    i === sectionIndex ? { ...s, questionIds: order } : s
  );
  return {
    ...schema,
    questions: [...schema.questions, merged],
    sections,
  };
}

/**
 * Сдвигает вопрос в списке первого раздела.
 */
export function moveQuestionInSchema(
  schema: SurveySchemaDocument,
  questionId: string,
  direction: "up" | "down"
): SurveySchemaDocument {
  const sectionIndex = 0;
  const section = schema.sections[sectionIndex];
  if (!section) {
    return schema;
  }
  const order = [...section.questionIds];
  const at = order.indexOf(questionId);
  if (at < 0) {
    return schema;
  }
  const swapWith = direction === "up" ? at - 1 : at + 1;
  if (swapWith < 0 || swapWith >= order.length) {
    return schema;
  }
  [order[at], order[swapWith]] = [order[swapWith], order[at]];
  const sections = schema.sections.map((s, i) =>
    i === sectionIndex ? { ...s, questionIds: order } : s
  );
  return { ...schema, sections };
}

/**
 * Вопросы в порядке первого раздела.
 */
export function orderedSurveyQuestions(schema: SurveySchemaDocument): SurveyQuestion[] {
  const section = schema.sections[0];
  if (!section) {
    return schema.questions;
  }
  const byId = new Map(schema.questions.map((q) => [q.id, q]));
  const ordered: SurveyQuestion[] = [];
  for (const id of section.questionIds) {
    const q = byId.get(id);
    if (q) {
      ordered.push(q);
    }
  }
  for (const q of schema.questions) {
    if (!section.questionIds.includes(q.id)) {
      ordered.push(q);
    }
  }
  return ordered;
}
