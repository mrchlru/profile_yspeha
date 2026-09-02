import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import { documentReportSource, parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import {
  assertFolderReportSession,
  type FolderReportSource,
} from "@/lib/admin/folderReportSessions";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import { AUDIT_YOY_METRIC_KEYS } from "@/lib/audit/report/auditReportTypes";
import {
  buildProctorFolderViolationsReportView,
  type ProctorViolationsReportView,
} from "@/lib/proctor/buildProctorViolationsReport";
import { prisma } from "@/lib/prisma";

export type ReportPdfKind = "screening" | "audit" | "audit_manager";

export type ScreeningBriefReportView = {
  kind: "screening_brief";
  title: string;
  profileName: string;
  createdAt: string;
  kotIp: number;
  maxScore: number;
  kotIpLevelLabel: string;
  kotIpNormNote: string;
  conclusionText: string | null;
  hiringRecommendations: string | null;
};

import type { AuditReportManagerMaslachBrief } from "@/lib/audit/report/auditReportTypes";

export type AuditBriefReportView = {
  kind: "audit_brief";
  title: string;
  fullName: string;
  createdAt: string;
  generatedAt: string | null;
  reportProfile: string | null;
  testLines: ReadonlyArray<{
    title: string;
    briefAnswer: string;
    danger?: boolean;
    alertHeadline?: string;
    alertFootnote?: string;
    maslachBrief?: AuditReportManagerMaslachBrief;
  }>;
  aiConclusion: string | null;
  burnoutPiCritical?: boolean;
};

export type EmployeeDashboardReportView = {
  kind: "dashboard";
  title: string;
  fullName: string;
  createdAt: string;
  metrics: ReadonlyArray<{ label: string; value: number }>;
  yearOverYearNote: string | null;
  aiConclusion: string | null;
  managerConclusion: string | null;
};

export type ReportHtmlView =
  | ScreeningBriefReportView
  | AuditBriefReportView
  | EmployeeDashboardReportView
  | ProctorViolationsReportView;

function _parseKotReport(value: unknown): KotReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<KotReportJson>;
  if (typeof row.rawScore !== "number" || typeof row.kotIpLevelLabel !== "string") {
    return null;
  }
  return row as KotReportJson;
}

function _parseAuditReport(value: unknown): AuditReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<AuditReportJson>;
  if (row.version !== 1 || !row.managerBrief) {
    return null;
  }
  return row as AuditReportJson;
}

/**
 * Строит HTML-представление отчёта для просмотра в админке.
 */
export async function buildReportHtmlView(
  folderKey: string,
  documentId: EmployeeDocumentSlotId,
  sessionId: string
): Promise<ReportHtmlView | null> {
  if (documentId === "violations_report") {
    return _buildViolationsReport(folderKey);
  }

  const source = documentReportSource(documentId, folderKey);
  if (!source) {
    return null;
  }

  const allowed = await assertFolderReportSession(folderKey, source, sessionId);
  if (!allowed) {
    return null;
  }

  if (source === "screening" && documentId === "short_report") {
    return _buildScreeningBrief(sessionId);
  }

  if (source === "audit" && documentId === "short_report") {
    return _buildAuditBrief(sessionId);
  }

  if (source === "audit" && documentId === "dashboard") {
    return _buildDashboard(sessionId);
  }

  return null;
}

/**
 * Возвращает тип PDF-отчёта для документа.
 */
export function resolveReportPdfKind(
  folderKey: string,
  documentId: EmployeeDocumentSlotId
): ReportPdfKind | null {
  if (documentId === "manager_report") {
    return documentReportSource(documentId, folderKey) === "audit" ? "audit_manager" : null;
  }
  if (documentId !== "full_report") {
    return null;
  }
  const source = documentReportSource(documentId, folderKey);
  if (source === "screening") {
    return "screening";
  }
  if (source === "audit") {
    return "audit";
  }
  return null;
}

async function _buildViolationsReport(
  folderKey: string
): Promise<ProctorViolationsReportView | null> {
  if (parseEmployeeFolderKey(folderKey) === null) {
    return null;
  }

  return buildProctorFolderViolationsReportView(folderKey);
}

async function _buildScreeningBrief(sessionId: string): Promise<ScreeningBriefReportView | null> {
  const row = await prisma.screeningSubmission.findUnique({
    where: { sessionId },
    select: {
      profileName: true,
      createdAt: true,
      kotReport: true,
    },
  });
  if (!row) {
    return null;
  }
  const kot = _parseKotReport(row.kotReport);
  if (!kot) {
    return null;
  }

  return {
    kind: "screening_brief",
    title: "Короткий отчёт — скрининг",
    profileName: row.profileName,
    createdAt: row.createdAt.toISOString(),
    kotIp: kot.kotIp,
    maxScore: kot.maxScore,
    kotIpLevelLabel: kot.kotIpLevelLabel,
    kotIpNormNote: kot.kotIpNormNote,
    conclusionText: kot.conclusionText,
    hiringRecommendations: kot.hiringRecommendations,
  };
}

async function _buildAuditBrief(sessionId: string): Promise<AuditBriefReportView | null> {
  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId },
    select: {
      firstName: true,
      lastName: true,
      createdAt: true,
      auditReport: true,
    },
  });
  if (!row) {
    return null;
  }
  const report = _parseAuditReport(row.auditReport);
  if (!report) {
    return null;
  }

  return {
    kind: "audit_brief",
    title: "Короткий отчёт — аудит",
    fullName: `${row.lastName} ${row.firstName}`.trim(),
    createdAt: row.createdAt.toISOString(),
    generatedAt: report.generatedAt ?? null,
    reportProfile: report.reportProfile ?? null,
    testLines: report.managerBrief.testLines.map((line) => ({
      title: line.title,
      briefAnswer: line.briefAnswer,
      danger: line.danger,
      alertHeadline: line.alertHeadline,
      alertFootnote: line.alertFootnote,
      maslachBrief: line.maslachBrief,
    })),
    aiConclusion: report.managerBrief.aiConclusion,
    burnoutPiCritical: report.burnoutPiAlert?.critical === true,
  };
}

async function _buildDashboard(sessionId: string): Promise<EmployeeDashboardReportView | null> {
  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId },
    select: {
      firstName: true,
      lastName: true,
      createdAt: true,
      auditReport: true,
    },
  });
  if (!row) {
    return null;
  }
  const report = _parseAuditReport(row.auditReport);
  if (!report) {
    return null;
  }

  const metrics = AUDIT_YOY_METRIC_KEYS.map((entry) => ({
    label: entry.label,
    value: report.metrics[entry.key],
  })).filter((entry): entry is { label: string; value: number } => typeof entry.value === "number");

  return {
    kind: "dashboard",
    title: "Дашборд по сотруднику",
    fullName: `${row.lastName} ${row.firstName}`.trim(),
    createdAt: row.createdAt.toISOString(),
    metrics,
    yearOverYearNote: report.ai.yearOverYearDynamics,
    aiConclusion: report.ai.conclusion,
    managerConclusion: report.managerBrief.aiConclusion,
  };
}

export function reportPdfSourceFromKind(kind: ReportPdfKind): FolderReportSource {
  return kind === "screening" ? "screening" : "audit";
}
