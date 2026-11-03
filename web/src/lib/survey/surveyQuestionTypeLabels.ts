import type { SurveyQuestionType } from "@/lib/survey/surveyTypes";

/** Подписи типов для редактора (как в спецификации). */
export const SURVEY_QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  short_text: "Короткий ответ",
  long_text: "Абзац",
  single_choice: "Один из списка",
  multiple_choice: "Несколько из списка",
  dropdown: "Раскрывающийся список",
  linear_scale: "Шкала",
  rating: "Рейтинг",
  grid_single: "Сетка (один в строке)",
  grid_checkbox: "Сетка флажков",
  date: "Дата",
  time: "Время",
  file_upload: "Загрузка файла",
  title_block: "Заголовок и описание",
  image_block: "Изображение",
  video_block: "Видео",
  section: "Раздел (новая страница)",
};

/** Типы, доступные для добавления из панели редактора (этап 1 — расширяемый список). */
export const SURVEY_ADDABLE_QUESTION_TYPES: ReadonlyArray<SurveyQuestionType> = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "linear_scale",
  "rating",
  "section",
  "title_block",
];
