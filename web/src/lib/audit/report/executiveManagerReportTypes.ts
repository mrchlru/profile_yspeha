/**
 * Экспертный отчёт для собственника/HRD (v2).
 * Отдельный документ; не путать с кратким managerBrief.
 */

export const EXECUTIVE_MANAGER_REPORT_VERSION = 1 as const;

/** Фиксированные 14 направлений HR-анализа (как в референсе Кальмина/Васильев). */
export const EXECUTIVE_HR_ANALYSIS_14_TITLES = [
  "Чем полезен для бизнеса",
  "Скрытые риски в руководителе",
  "Какое обучение требуется для прокачки западающих компетенций",
  "Сильная сторона",
  "Чего опасаться собственнику",
  "Компетенция для экономического стимулирования",
  "Что выбьет из колеи",
  "Как быстро вернуть в рабочее ресурсное состояние",
  "Какой подарок обрадует и будет ценить",
  "Что нужно знать собственнику",
  "Что нужно знать директору по персоналу (HRD)",
  "Что нужно знать службе СБ",
  "Что нужно знать непосредственному руководителю",
  "О чём HRD говорить на первой личной встрече",
] as const;

export type ExecutiveHrAnalysis14Title = (typeof EXECUTIVE_HR_ANALYSIS_14_TITLES)[number];

export type ExecutiveManagerReportProfile =
  | "screening"
  | "tu_management_chef"
  | "od_reserve"
  | "other";

export type ExecutiveKeyValueRow = {
  label: string;
  value: string;
};

export type ExecutiveHrAnalysisItem = {
  title: ExecutiveHrAnalysis14Title | string;
  content: string;
};

export type ExecutiveManagerReportV1 = {
  version: typeof EXECUTIVE_MANAGER_REPORT_VERSION;
  generatedAt: string;
  fullName: string;
  reportProfile: ExecutiveManagerReportProfile;
  /** Одна фраза под шапкой. */
  keyTakeaway: string;
  purpose: string;
  executiveSummary: {
    paragraphs: ReadonlyArray<string>;
    keyConclusion: string;
  };
  overallAssessment: {
    lead: string;
    bullets: ReadonlyArray<string>;
    closing: string;
  };
  strengths: {
    managerial: ReadonlyArray<string>;
    personal: ReadonlyArray<string>;
  };
  motivationProfile: {
    lead: string;
    drivers: ReadonlyArray<string>;
  };
  managementStyle: {
    lead: string;
    focusPoints: ReadonlyArray<string>;
    conflictNote: string;
    bestFit: ReadonlyArray<string>;
  };
  psychoEmotional: {
    lead: string;
    findings: ReadonlyArray<string>;
    implications: ReadonlyArray<string>;
    closing: string;
  };
  workload: {
    objectiveLabel: string;
    objectiveText: string;
    subjectiveLabel: string;
    subjectiveText: string;
    emotionalLabel: string;
    emotionalText: string;
    overloadRiskLabel: string;
    metricsTable: ReadonlyArray<ExecutiveKeyValueRow>;
    expertNote: string;
  };
  businessRisks: ReadonlyArray<{
    title: string;
    text: string;
  }>;
  recommendations: {
    /** Группы: «Организация работы», «Развитие», «Работа с мотивацией» или «Приоритетные действия». */
    groups: ReadonlyArray<{
      title: string;
      items: ReadonlyArray<string>;
    }>;
  };
  finalConclusion: {
    paragraphs: ReadonlyArray<string>;
    managerialVerdict: string;
  };
  scorecard: ReadonlyArray<ExecutiveKeyValueRow>;
  hrAnalysis14: ReadonlyArray<ExecutiveHrAnalysisItem>;
};

/**
 * Проверяет минимальную валидность сохранённого экспертного отчёта.
 */
export function isExecutiveManagerReportV1(value: unknown): value is ExecutiveManagerReportV1 {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<ExecutiveManagerReportV1>;
  return (
    row.version === EXECUTIVE_MANAGER_REPORT_VERSION &&
    typeof row.keyTakeaway === "string" &&
    typeof row.purpose === "string" &&
    Array.isArray(row.hrAnalysis14) &&
    row.hrAnalysis14.length >= 10 &&
    Array.isArray(row.scorecard) &&
    row.executiveSummary !== undefined &&
    Array.isArray(row.executiveSummary.paragraphs)
  );
}
