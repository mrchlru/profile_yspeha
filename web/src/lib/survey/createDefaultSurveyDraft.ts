import type {
  SurveyMode,
  SurveySchemaDocument,
  SurveySettingsDocument,
} from "@/lib/survey/surveyTypes";

/**
 * Возвращает пустой документ схемы с одним разделом.
 */
export function createDefaultSurveySchema(mode: SurveyMode, title?: string): SurveySchemaDocument {
  const sectionId = crypto.randomUUID();
  return {
    version: 1,
    title: title?.trim() || "Без названия",
    description: "",
    coverImageUrl: null,
    sections: [
      {
        id: sectionId,
        title: "Раздел 1",
        description: "",
        questionIds: [],
      },
    ],
    questions: [],
    scales: [],
    scoreThresholds: [],
    scaleThresholds: {},
  };
}

/**
 * Настройки по умолчанию для нового опроса.
 */
export function createDefaultSurveySettings(): SurveySettingsDocument {
  return {
    anonymous: false,
    shuffleQuestions: false,
    timerMinutes: null,
    proctorEnabled: true,
    identityQuestionnaire: true,
    showResultToRespondent: "none",
    welcomeTitle: "Добро пожаловать",
    welcomeText: "",
    finishTitle: "Спасибо",
    finishText: "Ваши ответы сохранены.",
    allowMultipleResponses: false,
    publicLinkEnabled: false,
    publicLinkToken: null,
  };
}
