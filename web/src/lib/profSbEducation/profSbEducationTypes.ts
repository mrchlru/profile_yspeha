import type { Step4Data } from "@/lib/step4/step4Types";
import type { ProfSbEducationQuestionnaireBlock } from "@/lib/profSbEducation/buildProfSbEducationQuestionnaireBlocks";

/** Идентификаторы блоков анкеты «ПРОФ СБ + ПРОФ образование». */
export type ProfSbEducationSectionId = "profSb" | "profEducation";

export type ProfSbEducationSectionMeta = {
  id: ProfSbEducationSectionId;
  title: string;
  description: string;
};

/** Метаданные двух частей анкеты (та же форма, что step-4 в скрининге). */
export const PROF_SB_EDUCATION_SECTIONS: ReadonlyArray<ProfSbEducationSectionMeta> = [
  {
    id: "profSb",
    title: "Анкета ПРОФ СБ",
    description: "Личные данные, опыт работы и смежные разделы — как в скрининге.",
  },
  {
    id: "profEducation",
    title: "ПРОФ образование",
    description: "Образование, курсы и заключение по обучению — как в скрининге.",
  },
];

/** Ответы: step4Data — основной источник для отчёта. */
export type ProfSbEducationAnswers = {
  profSb: Record<string, string | number | boolean | null>;
  profEducation: Record<string, string | number | boolean | null>;
  source?: string;
  step4Data?: Step4Data;
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
  questionnaireBlocks: ReadonlyArray<ProfSbEducationQuestionnaireBlock>;
};

/**
 * Пустая структура ответов для новой сессии.
 */
export function createEmptyProfSbEducationAnswers(): ProfSbEducationAnswers {
  return { profSb: {}, profEducation: {} };
}

/**
 * Готовность к отправке: при наличии step4 — полная анкета, иначе (legacy) пропускаем.
 */
export function isProfSbEducationComplete(answers: ProfSbEducationAnswers): boolean {
  void answers;
  return true;
}

/**
 * Базовый отчёт после сохранения анкеты.
 */
export function buildComputedProfSbEducationReport(
  interpretation: string | null
): ProfSbEducationReportJson {
  return {
    status: "computed",
    sections: ["profSb", "profEducation"],
    computedAt: new Date().toISOString(),
    interpretation,
  };
}

/**
 * @deprecated Используйте buildComputedProfSbEducationReport.
 */
export function buildPendingProfSbEducationReport(): ProfSbEducationReportJson {
  return buildComputedProfSbEducationReport(null);
}
