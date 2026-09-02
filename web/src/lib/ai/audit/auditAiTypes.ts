import type { AuditReportYoY } from "@/lib/audit/report/auditReportTypes";

/** Уровень операционного риска (детерминированный слой). */
export type AuditRiskLevel = "low" | "medium" | "high" | "critical";

export type AuditRiskScoreItem = {
  key: string;
  label: string;
  level: AuditRiskLevel;
  /** 0–100, взвешенный вклад. */
  score: number;
  weight: number;
  evidence: string;
};

export type AuditOrganizationalFitLevel = "good" | "neutral" | "poor";

export type AuditRiskProfile = {
  items: ReadonlyArray<AuditRiskScoreItem>;
  retentionProbability: AuditRiskLevel;
  burnoutRisk: AuditRiskLevel;
  conflictRisk: AuditRiskLevel;
  sabotageRisk: AuditRiskLevel;
  motivationLossRisk: AuditRiskLevel;
  organizationalFit: {
    startup: AuditOrganizationalFitLevel;
    corporate: AuditOrganizationalFitLevel;
    government: AuditOrganizationalFitLevel;
    remoteTeam: AuditOrganizationalFitLevel;
    projectEnvironment: AuditOrganizationalFitLevel;
  };
};

export type AuditInterpretationHint = {
  signalKey: string;
  levelKey: string;
  meaning: ReadonlyArray<string>;
  managementRisk: AuditRiskLevel;
  adaptationFocus: ReadonlyArray<string>;
};

/** Нормализованные сигналы по всем методикам (без сырого PDF и без методических простыней). */
export type AuditNormalizedSignals = {
  decisionStyle: {
    pairsAnswered: number;
    styleCounts: Record<string, number>;
    dominantStyles: ReadonlyArray<number>;
    complete: boolean;
  };
  goalPursuit: { sum: number | null; level: string | null; complete: boolean };
  paperwork: { groupScores: Record<string, number>; profiles: ReadonlyArray<string>; complete: boolean };
  selfMonitoring: { score: number | null; level: string | null; complete: boolean };
  riskReadiness: { sum: number | null; level: string | null; complete: boolean };
  stressType: { sum: number | null; profile: string | null; complete: boolean };
  adaptability: { diff: number | null; level: string | null; complete: boolean };
  locusOfControl: {
    external: number | null;
    internal: number | null;
    orientation: string | null;
    complete: boolean;
  };
  tolerance: {
    tn: number | null;
    itn1: number | null;
    mitn: number | null;
    complete: boolean;
  };
  cfit: {
    rawScore: number;
    /** Строка «общая сумма» таблицы прил. III для IQ; null если raw < 21. */
    iqLookupRaw: number | null;
    iq: number | null;
    answered: number;
    scorable: number;
    complete: boolean;
  };
  keirsey: {
    typeCode: string | null;
    temperament: string | null;
    complete: boolean;
  };
  burnout: {
    pi: number | null;
    lo: number | null;
    pm: number | null;
    ipv: number | null;
    workerLoad: number | null;
    piBand: string | null;
    loBand: string | null;
    complete: boolean;
  };
  conflictStyle: { dominant: string | null; complete: boolean };
  motivation: {
    leadingTypes: ReadonlyArray<string>;
    stimulationSummary: string | null;
    complete: boolean;
  };
  loyalty: { sum: number | null; level: string | null; complete: boolean };
  communication: {
    commLevel: number | null;
    orgLevel: number | null;
    commK: number | null;
    orgK: number | null;
    complete: boolean;
  };
  erudition: { scaledScore: number | null; grade: string | null; complete: boolean };
};

/** Сигналы батареи скрининга кандидата (6 блоков методик). */
export type CandidateScreeningNormalizedSignals = {
  cfit: AuditNormalizedSignals["cfit"];
  conflictStyle: AuditNormalizedSignals["conflictStyle"];
  motivation: AuditNormalizedSignals["motivation"];
  burnout: AuditNormalizedSignals["burnout"];
  sectarianism: {
    answeredCount: number;
    totalCount: number;
    complete: boolean;
    anyDetected: boolean;
    detectedProfileNames: ReadonlyArray<string>;
    profileScores: ReadonlyArray<{
      profileId: string;
      displayName: string;
      scorePercent: number;
      detected: boolean;
    }>;
  };
};

/** Сигналы батареи ОД / руководителей / резерва (12 методик). */
export type OdReserveNormalizedSignals = {
  cfit: AuditNormalizedSignals["cfit"];
  communication: AuditNormalizedSignals["communication"];
  conflictStyle: AuditNormalizedSignals["conflictStyle"];
  motivation: AuditNormalizedSignals["motivation"];
  burnout: AuditNormalizedSignals["burnout"];
  decisionStyle: AuditNormalizedSignals["decisionStyle"];
  goalPursuit: AuditNormalizedSignals["goalPursuit"];
  riskReadiness: AuditNormalizedSignals["riskReadiness"];
  stressType: AuditNormalizedSignals["stressType"];
  adaptability: AuditNormalizedSignals["adaptability"];
  locusOfControl: AuditNormalizedSignals["locusOfControl"];
  maslachMbi: {
    ee: number | null;
    dp: number | null;
    pa: number | null;
    classicBurnout: boolean;
    eeLevel: string | null;
    dpLevel: string | null;
    paLevel: string | null;
    complete: boolean;
  };
};

export type AuditAiPipelinePayload = {
  participant: {
    fullName: string;
    sessionId: string;
    assesseeKey: string;
  };
  signals: AuditNormalizedSignals | OdReserveNormalizedSignals | CandidateScreeningNormalizedSignals;
  riskProfile: AuditRiskProfile;
  interpretationHints: ReadonlyArray<AuditInterpretationHint>;
  yearOverYear: AuditReportYoY | null;
  methodologyWeights: Record<string, number>;
};

/**
 * Структурированное заключение от LLM (json_schema) в стиле референсного отчёта:
 * связный нарратив по разделам. Числа и таблицы добавляются детерминированно.
 */
export type AuditHrStructuredReport = {
  intelligenceVerdict: string;
  motivationCommentary: string;
  psychotypeRealization: string;
  methodologyInsights: ReadonlyArray<string>;
  risksAndAdditional: string;
  yearOverYearDynamics: string;
  managerBriefConclusion: string;
};
