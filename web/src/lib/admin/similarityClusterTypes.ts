import type { ReportExportTestKind } from "@/lib/admin/reportExportKinds";



/** Жёсткий порог: высокий риск списывания. */

export const ANSWER_SIMILARITY_THRESHOLD = 0.65;



/** Мягкий порог: подозрение на грани (жёлтая зона). */

export const ANSWER_SIMILARITY_SOFT_THRESHOLD = 0.6;



/** Минимум сопоставимых вопросов в субтесте, иначе сравнение не учитывается. */

export const ANSWER_SIMILARITY_MIN_COMPARABLE = 8;



/** Разрыв между прохождениями (мин), усиливающий подозрение. */

export const ANSWER_SIMILARITY_CLOSE_COMPLETION_MINUTES = 30;



export type SimilarityMatchSeverity = "high" | "soft";



export type SimilarityFolderSeverity = "high" | "soft";



export type SimilarityFolderHint = {

  clusterId: string;

  colorIndex: number;

  memberCount: number;

  testKind: string;

  testKindLabel: string;

  similarityPercent: number;

  /** Субтестов с совпадением ≥ мягкого порога (60%). */

  suspiciousSubtestCount: number;

  /** Субтестов с совпадением ≥ 65%. */

  highSubtestCount: number;

  /** Субтестов только в зоне 60–64%. */

  softSubtestCount: number;

  severity: SimilarityFolderSeverity;

  hasCloseInTimeMatch: boolean;

};



export type SubtestSimilarityPeerMatch = {

  otherFolderKey: string;

  otherDisplayName: string;

  similarityPercent: number;

  severity: SimilarityMatchSeverity;

  completedAtGapMinutes: number | null;

  closeInTime: boolean;

};



export type SubtestSimilarityAlert = {

  subtestId: string;

  subtestLabel: string;

  testKind: ReportExportTestKind;

  testKindLabel: string;

  maxSeverity: SimilarityMatchSeverity;

  matches: SubtestSimilarityPeerMatch[];

};



export type SubtestSimilarityFolderSummary = {

  totalAlertSubtests: number;

  highSubtestCount: number;

  softSubtestCount: number;

  hasCloseInTimeMatch: boolean;

};



export type SimilarityClusterSummary = {

  clusterId: string;

  colorIndex: number;

  folderKeys: string[];

  testKind: string;

  testKindLabel: string;

  memberCount: number;

  subtestId: string;

  subtestLabel: string;

};



export type SimilarityClustersResult = {

  thresholdPercent: number;

  softThresholdPercent: number;

  closeCompletionMinutes: number;

  folderHints: Record<string, SimilarityFolderHint>;

  clusters: SimilarityClusterSummary[];

  folderAlerts: Record<string, SubtestSimilarityAlert[]>;

};



export type FolderSubtestSimilarityResult = {

  thresholdPercent: number;

  softThresholdPercent: number;

  closeCompletionMinutes: number;

  summary: SubtestSimilarityFolderSummary;

  alerts: SubtestSimilarityAlert[];

};



/** Уровень совпадения по проценту. */

export function similaritySeverityFromPercent(percent: number): SimilarityMatchSeverity | null {

  if (percent >= Math.round(ANSWER_SIMILARITY_THRESHOLD * 100)) {

    return "high";

  }

  if (percent >= Math.round(ANSWER_SIMILARITY_SOFT_THRESHOLD * 100)) {

    return "soft";

  }

  return null;

}


