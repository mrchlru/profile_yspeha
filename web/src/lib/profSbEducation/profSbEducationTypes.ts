/** Идентификаторы блоков анкеты «ПРОФ СБ + ПРОФ образование». */
export type ProfSbEducationSectionId = "profSb" | "profEducation";

export type ProfSbEducationSectionMeta = {
  id: ProfSbEducationSectionId;
  title: string;
  description: string;
};

/** Метаданные двух частей анкеты (вопросы добавятся отдельным PR). */
export const PROF_SB_EDUCATION_SECTIONS: ReadonlyArray<ProfSbEducationSectionMeta> = [
  {
    id: "profSb",
    title: "Анкета ПРОФ СБ",
    description: "Расширенная анкета кандидата из скрининга (step-4): те же поля и валидация.",
  },
  {
    id: "profEducation",
    title: "ПРОФ образование",
    description: "Блок профессионального образования и развития (содержание уточняется).",
  },
];

/** Ответы по блокам; ключи вопросов появятся вместе с методикой. */
export type ProfSbEducationAnswers = {
  profSb: Record<string, string | number | boolean | null>;
  profEducation: Record<string, string | number | boolean | null>;
};

export type ProfSbEducationReportJson = {
  status: "pending_methodology" | "computed";
  sections: ReadonlyArray<ProfSbEducationSectionId>;
  computedAt: string;
  interpretation: string | null;
};

/** Данные для просмотра результата в админке (API → клиент). */
export type ProfSbEducationReportView = {
  sessionId: string;
  personName: string;
  createdAt: string;
  report: ProfSbEducationReportJson | null;
  answers: Record<string, unknown>;
};

/**
 * Пустая структура ответов для новой сессии.
 */
export function createEmptyProfSbEducationAnswers(): ProfSbEducationAnswers {
  return { profSb: {}, profEducation: {} };
}

/**
 * Проверяет готовность к отправке. Пока методика не загружена — достаточно пустых блоков.
 */
export function isProfSbEducationComplete(answers: ProfSbEducationAnswers): boolean {
  void answers;
  return true;
}

/**
 * Формирует заглушку отчёта до внедрения ключей и интерпретации.
 */
export function buildPendingProfSbEducationReport(): ProfSbEducationReportJson {
  return {
    status: "pending_methodology",
    sections: ["profSb", "profEducation"],
    computedAt: new Date().toISOString(),
    interpretation: null,
  };
}
