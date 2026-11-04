/** Режим опроса: без ключей или с оценкой. */
export type SurveyMode = "survey" | "test";

/** Жизненный цикл опроса в конструкторе. */
export type SurveyStatus = "draft" | "published" | "archived";

/** Типы вопросов и служебных блоков (этап 1 — полный перечень в схеме). */
export type SurveyQuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "linear_scale"
  | "rating"
  | "grid_single"
  | "grid_checkbox"
  | "date"
  | "time"
  | "file_upload"
  | "title_block"
  | "image_block"
  | "video_block"
  | "section";

export type SurveyOption = {
  id: string;
  label: string;
  /** Переход к разделу (single_choice / dropdown). */
  gotoSectionId?: string | null;
  scales?: Record<string, number>;
};

export type SurveyQuestionBase = {
  id: string;
  code: string;
  type: SurveyQuestionType;
  title: string;
  description?: string;
  required?: boolean;
  imageUrl?: string | null;
  showIf?: unknown | null;
  timeLimitSec?: number | null;
  scaleKey?: string | null;
};

export type SurveyQuestion =
  | (SurveyQuestionBase & {
      type: "short_text" | "long_text";
      validation?: {
        kind?: "number" | "email" | "length" | "regex";
        min?: number;
        max?: number;
        pattern?: string;
      };
    })
  | (SurveyQuestionBase & {
      type: "single_choice" | "multiple_choice" | "dropdown";
      options: SurveyOption[];
      shuffle?: boolean;
      otherOption?: boolean;
      minSelections?: number;
      maxSelections?: number;
      points?: number;
      correctOptionIds?: string[];
      partialCredit?: boolean;
    })
  | (SurveyQuestionBase & {
      type: "linear_scale";
      min: number;
      max: number;
      minLabel?: string;
      maxLabel?: string;
      reverseScored?: boolean;
    })
  | (SurveyQuestionBase & {
      type: "rating";
      max: number;
      icon?: "star" | "heart";
    })
  | (SurveyQuestionBase & {
      type: "grid_single" | "grid_checkbox";
      rows: { id: string; label: string }[];
      columns: { id: string; label: string }[];
      shuffleRows?: boolean;
    })
  | (SurveyQuestionBase & {
      type: "date" | "time" | "file_upload";
    })
  | (SurveyQuestionBase & {
      type: "title_block" | "image_block" | "video_block";
    })
  | (SurveyQuestionBase & {
      type: "section";
      /** После раздела: next | section | submit */
      afterAction?: "next" | "section" | "submit";
      gotoSectionId?: string | null;
    });

export type SurveySection = {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
};

export type SurveyScaleDefinition = {
  id: string;
  title: string;
  aggregation: "sum" | "average";
};

export type SurveyThresholdBand = {
  from: number;
  to: number;
  zone: "normal" | "attention" | "risk";
  managerText: string;
};

export type SurveySchemaDocument = {
  version: 1;
  title: string;
  description?: string;
  coverImageUrl?: string | null;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  scales: SurveyScaleDefinition[];
  scoreThresholds: SurveyThresholdBand[];
  scaleThresholds: Record<string, SurveyThresholdBand[]>;
};

export type SurveySettingsDocument = {
  anonymous: boolean;
  shuffleQuestions: boolean;
  timerMinutes: number | null;
  proctorEnabled: boolean;
  identityQuestionnaire: boolean;
  showResultToRespondent: "none" | "score" | "score_and_answers_after_review";
  welcomeTitle?: string;
  welcomeText?: string;
  finishTitle?: string;
  finishText?: string;
  /** Повторное прохождение по тому же коду приглашения. */
  allowMultipleResponses: boolean;
  /** Единая ссылка для всех респондентов (без персонального кода). */
  publicLinkEnabled: boolean;
  publicLinkToken: string | null;
};

export type SurveyListItem = {
  id: string;
  title: string;
  mode: SurveyMode;
  status: SurveyStatus;
  questionCount: number;
  responseCount: number;
  pendingReviewCount: number;
  versionLabel: string;
  anonymous: boolean;
  updatedAt: string;
  createdByEmail: string | null;
  currentVersionNumber: number | null;
};

export type SurveyDraftPayload = {
  surveyId: string;
  revision: number;
  schema: SurveySchemaDocument;
  settings: SurveySettingsDocument;
  status: SurveyStatus;
  mode: SurveyMode;
  currentVersionNumber: number | null;
  responseCount: number;
};
