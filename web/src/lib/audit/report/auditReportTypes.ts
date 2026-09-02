/**
 * JSON `audit_report` у `AuditSubmission`: версионируемый снимок скоринга,
 * сводок по шагам, сравнения с прошлой волной и метаданных доставки (ИИ/PDF/email).
 */

import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";

export type AuditReportVersion = 1;

export type AuditReportStepSummary = {
  stepIndex: number;
  slug: string;
  internalKey: string;
  summary: string;
};

/** Шкала риска Шуберта (−50…+50) для визуализации в PDF. */
export type AuditReportSchubertScale = {
  sum: number;
  min: number;
  max: number;
};

import type { AuditReportNarrativeParagraphInput } from "@/lib/audit/report/auditNarrativeParagraph";

export type {
  AuditReportNarrativeParagraph,
  AuditReportNarrativeParagraphInput,
} from "@/lib/audit/report/auditNarrativeParagraph";

/** Строка справочной таблицы КОС (уровень / оценка / показатель). */
export type AuditReportKosTableRow = {
  level: string;
  grade: string;
  indicator: string;
};

/** Справочная таблица шкалы КОС в нарративной секции. */
export type AuditReportKosReferenceTable = {
  title: string;
  rows: ReadonlyArray<AuditReportKosTableRow>;
};

/** Нормативная таблица шкалы выгорания (5 колонок, одна строка диапазонов). */
export type AuditReportBurnoutNormTable = {
  title: string;
  headers: ReadonlyArray<string>;
  ranges: ReadonlyArray<string>;
};

/** Нарративная секция отчёта в стиле референсного кадрового заключения. */
export type AuditReportNarrativeSection = {
  sectionIndex: number;
  title: string;
  paragraphs: ReadonlyArray<AuditReportNarrativeParagraphInput>;
  /** Справочные таблицы шкал КОС (секция 5). */
  kosTables?: ReadonlyArray<AuditReportKosReferenceTable>;
  /** Нормативные таблицы шкал выгорания (секция 6). */
  burnoutTables?: ReadonlyArray<AuditReportBurnoutNormTable>;
};

/** Блок отчёта по одной методике (или группе, напр. CFIT). */
export type AuditReportTestBlock = {
  blockIndex: number;
  title: string;
  methodology: string;
  stepIndexes: ReadonlyArray<number>;
  internalKeys: ReadonlyArray<string>;
  results: ReadonlyArray<string>;
  /** Абзацы раздела «О методике». */
  aboutParagraphs: ReadonlyArray<string>;
  /** Абзацы раздела «Заключение» по результатам испытуемого. */
  conclusionParagraphs: ReadonlyArray<string>;
  /** Полный текст (about + conclusion) для JSON и совместимости. */
  interpretation: string;
  /** Визуальная шкала готовности к риску (Тест 5). */
  schubertScale?: AuditReportSchubertScale;
};

export type AuditReportMetricDelta = {
  key: string;
  label: string;
  before: number | null;
  after: number;
  delta: number | null;
};

export type AuditReportYoY = {
  previousSessionId: string | null;
  previousCreatedAt: string | null;
  deltas: ReadonlyArray<AuditReportMetricDelta>;
};

/** Структурированный HR-отчёт от LLM (json_schema synthesis). */
export type AuditReportManagerTrafficLight = "green" | "yellow" | "orange" | "red";

export type AuditReportManagerMaslachScaleLine = {
  scaleTitle: string;
  whatItMeasures: string;
  statusLabel: string;
  managerMeaning: string;
  trafficLight: AuditReportManagerTrafficLight;
};

/** Развёрнутая интерпретация Маслач в блоке для руководителя (без баллов). */
export type AuditReportManagerMaslachBrief = {
  overallTitle: string;
  overallText: string;
  overallTrafficLight: AuditReportManagerTrafficLight;
  scales: ReadonlyArray<AuditReportManagerMaslachScaleLine>;
};

/** Одна строка краткой выжимки по методике для руководителя. */
export type AuditReportManagerLine = {
  blockIndex: number;
  title: string;
  briefAnswer: string;
  /** Критическое ПИ — выделение красным в отчёте. */
  danger?: boolean;
  /** Красный жирный заголовок алерта (сектантство и др.). */
  alertHeadline?: string;
  /** Подпись под алертом: курсив, чёрный, меньший кегль. */
  alertFootnote?: string;
  maslachBrief?: AuditReportManagerMaslachBrief;
};

/** Блок «Отчёт для руководителя» (≤2 стр. PDF в конце документа). */
export type AuditReportManagerBrief = {
  testLines: ReadonlyArray<AuditReportManagerLine>;
  aiConclusion: string | null;
};

/**
 * Структурированное заключение (ИИ) в стиле референсного отчёта: связный нарратив
 * по разделам. Числовые результаты и таблицы добавляются детерминированно (см. `conclusion`).
 */
export type AuditReportAiStructured = {
  /** Практический вывод по уровню интеллекта (без повтора самого числа IQ). */
  intelligenceVerdict: string;
  /** Вводный абзац по мотивационному профилю перед таблицами. */
  motivationCommentary: string;
  /** Где психотип раскрывается лучше всего (роли, среды). */
  psychotypeRealization: string;
  /** Нумерованные выводы по методикам (конфликт, КОС, выгорание, локус, стресс и т.д.). */
  methodologyInsights: ReadonlyArray<string>;
  /** Раздел «Риски и дополнительные характеристики» в стиле референса. */
  risksAndAdditional: string;
  yearOverYearDynamics: string;
  /** Краткое заключение для руководителя (4–6 предложений, текущее состояние и динамика). */
  managerBriefConclusion: string;
};

/** Меры стимулирования по типу мотивации (детерминированно из таблицы Герчикова). */
export type AuditConclusionStimulation = {
  base: ReadonlyArray<string>;
  applicable: ReadonlyArray<string>;
  forbidden: ReadonlyArray<string>;
};

/** Ожидаемое трудовое поведение по типу мотивации. */
export type AuditConclusionWorkBehavior = {
  discipline: string;
  initiative: string;
  functionality: string;
  learning: string;
};

/** Один ведущий мотивационный тип с таблицами для итогового заключения. */
export type AuditConclusionMotivationType = {
  order: number;
  typeLabel: string;
  description: string;
  stimulation: AuditConclusionStimulation;
  workBehavior: AuditConclusionWorkBehavior;
};

/** Детерминированные данные заключения (IQ-банд + таблицы мотивации). */
export type AuditConclusionData = {
  intelligence: {
    iq: number | null;
    bandLabel: string;
    statement: string;
  };
  motivationTypes: ReadonlyArray<AuditConclusionMotivationType>;
};

export type AuditReportAiBlock = {
  conclusion: string | null;
  yearOverYearDynamics: string | null;
  generatedAt: string | null;
  /** Structured JSON от synthesis-слоя (для API/аналитики). */
  structured: AuditReportAiStructured | null;
};

export type AuditReportDelivery = {
  emailSent: boolean;
  pdfGenerated: boolean;
  /** Отдельный PDF для руководителя (не часть полного отчёта). */
  managerPdfGenerated?: boolean;
};

/**
 * Плоские метрики для сравнения год-к-году (только числовые, одинаковые ключи между волнами).
 */
export type AuditReportMetrics = Record<string, number>;

export type AuditReportBurnoutPiAlert = {
  critical: boolean;
  score: number | null;
  bandLabel: string | null;
};


export type AuditReportJson = {
  version: AuditReportVersion;
  generatedAt: string;
  /** Профиль батареи (для пересборки отчёта из ответов). */
  reportProfile?: AuditReportProfile;
  metrics: AuditReportMetrics;
  metricLabels: Record<string, string>;
  stepSummaries: ReadonlyArray<AuditReportStepSummary>;
  testBlocks: ReadonlyArray<AuditReportTestBlock>;
  /** 14 секций нарративного отчёта (порядок и стиль — как в референсе). */
  narrativeSections: ReadonlyArray<AuditReportNarrativeSection>;
  /** Детерминированные данные итогового заключения (IQ-банд + таблицы мотивации). */
  conclusion: AuditConclusionData;
  /** Флаг критического психоэмоционального истощения (ПИ ≥ 40). */
  burnoutPiAlert?: AuditReportBurnoutPiAlert | null;
  yoy: AuditReportYoY | null;
  ai: AuditReportAiBlock;
  managerBrief: AuditReportManagerBrief;
  delivery: AuditReportDelivery;
};

export const AUDIT_REPORT_VERSION: AuditReportVersion = 1;

/** Ключи метрик, которые выводим в YoY/PDF (остальное можно добавлять без ломки старых отчётов). */
export const AUDIT_YOY_METRIC_KEYS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "burnout_pi_sum", label: "Выгорание (Рукавишников) — ПИ" },
  { key: "burnout_lo_sum", label: "Выгорание (Рукавишников) — ЛО" },
  { key: "burnout_pm_sum", label: "Выгорание (Рукавишников) — ПМ" },
  { key: "burnout_ipv_sum", label: "Выгорание (Рукавишников) — ИПВ" },
  { key: "burnout_worker_load", label: "Выгорание (Рукавишников) — ИЗР (0–100)" },
  { key: "cfit_answered_total", label: "CFIT — число ответов (все субтесты)" },
  { key: "rowe_pairs_answered", label: "Роу — закрыто пар 1–40" },
];
