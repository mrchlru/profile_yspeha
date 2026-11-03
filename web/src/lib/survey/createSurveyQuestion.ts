import type { SurveyQuestion, SurveyQuestionType } from "@/lib/survey/surveyTypes";

/**
 * Создаёт новый вопрос или блок с уникальным id и кодом Qn.
 */
export function createSurveyQuestion(
  type: SurveyQuestionType,
  codeIndex: number
): SurveyQuestion {
  const id = crypto.randomUUID();
  const code = `Q${String(codeIndex)}`;
  const base = {
    id,
    code,
    type,
    title: "",
    required: false,
  };

  switch (type) {
    case "short_text":
    case "long_text":
      return { ...base, type };
    case "single_choice":
    case "multiple_choice":
    case "dropdown":
      return {
        ...base,
        type,
        options: [
          { id: crypto.randomUUID(), label: "Вариант 1" },
          { id: crypto.randomUUID(), label: "Вариант 2" },
        ],
        shuffle: false,
        otherOption: false,
        correctOptionIds: [],
        points: 0,
      };
    case "linear_scale":
      return { ...base, type, min: 1, max: 5, minLabel: "", maxLabel: "" };
    case "rating":
      return { ...base, type, max: 5, icon: "star" };
    case "grid_single":
    case "grid_checkbox":
      return {
        ...base,
        type,
        rows: [{ id: crypto.randomUUID(), label: "Строка 1" }],
        columns: [{ id: crypto.randomUUID(), label: "Столбец 1" }],
      };
    case "date":
    case "time":
    case "file_upload":
      return { ...base, type };
    case "title_block":
      return { ...base, type, title: "Заголовок" };
    case "image_block":
    case "video_block":
      return { ...base, type, title: "" };
    case "section":
      return { ...base, type, title: "Новый раздел", afterAction: "next" };
    default:
      return { ...base, type: "short_text" };
  }
}
