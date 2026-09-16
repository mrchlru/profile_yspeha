import { Prisma } from "@/generated/prisma/client";

import { generateExecutiveManagerReportAi } from "@/lib/ai/generateExecutiveManagerReportAi";
import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import {
  buildExecutiveManagerReportAiContextFromAudit,
  buildExecutiveManagerReportAiContextFromScreening,
} from "@/lib/audit/report/buildExecutiveManagerReportAiContext";
import {
  isExecutiveManagerReportV1,
  type ExecutiveManagerReportV1,
} from "@/lib/audit/report/executiveManagerReportTypes";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";
import { generateExecutiveManagerPdfBuffer } from "@/lib/report/generateExecutiveManagerPdf";

export type ExecutiveManagerReportSource = "screening" | "audit";

/**
 * Загружает / при необходимости генерирует экспертный отчёт и возвращает PDF.
 */
export async function generateExecutiveManagerReportPdfBySession(input: {
  sessionId: string;
  source: ExecutiveManagerReportSource;
  regenerate?: boolean;
}): Promise<Buffer | null> {
  const report = await ensureExecutiveManagerReport({
    sessionId: input.sessionId,
    source: input.source,
    regenerate: input.regenerate === true,
  });
  if (report === null) {
    return null;
  }
  return generateExecutiveManagerPdfBuffer({
    sessionId: input.sessionId,
    report,
  });
}

/**
 * Гарантирует наличие сохранённого `executiveManagerReport` (генерирует при отсутствии).
 */
export async function ensureExecutiveManagerReport(input: {
  sessionId: string;
  source: ExecutiveManagerReportSource;
  regenerate?: boolean;
}): Promise<ExecutiveManagerReportV1 | null> {
  if (input.source === "screening") {
    return _ensureScreeningExecutiveReport(input.sessionId, input.regenerate === true);
  }
  return _ensureAuditExecutiveReport(input.sessionId, input.regenerate === true);
}

async function _ensureScreeningExecutiveReport(
  sessionId: string,
  regenerate: boolean
): Promise<ExecutiveManagerReportV1 | null> {
  const row = await prisma.screeningSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      profileName: true,
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
      kotReport: true,
    },
  });
  if (!row) {
    return null;
  }

  const kotReport = _parseKotReport(row.kotReport);
  if (!kotReport) {
    return null;
  }

  const existing = kotReport.executiveManagerReport;
  if (!regenerate && isExecutiveManagerReportV1(existing)) {
    return existing;
  }

  const fullName = _screeningFullName(row.step4Data, row.profileName);
  const context = buildExecutiveManagerReportAiContextFromScreening({
    fullName,
    kotReport,
    step1Data: row.step1Data,
    step2Data: row.step2Data,
    step3Data: row.step3Data,
    step4Data: row.step4Data,
  });

  const generated = await generateExecutiveManagerReportAi({
    context,
    sessionRef: shortSessionRef(sessionId),
  });
  if (generated === null) {
    screeningServerLog("executive_manager_report", "screening_gen_failed", {
      sessionId,
      regenerate,
    });
    return regenerate && isExecutiveManagerReportV1(existing) ? existing : null;
  }

  const nextKot: KotReportJson = {
    ...kotReport,
    executiveManagerReport: generated,
  };
  await prisma.screeningSubmission.update({
    where: { sessionId },
    data: { kotReport: nextKot as unknown as Prisma.InputJsonValue },
  });
  screeningServerLog("executive_manager_report", "screening_saved", {
    sessionId,
    regenerate,
  });
  return generated;
}

async function _ensureAuditExecutiveReport(
  sessionId: string,
  regenerate: boolean
): Promise<ExecutiveManagerReportV1 | null> {
  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      answers: true,
      auditReport: true,
    },
  });
  if (!row) {
    return null;
  }

  const auditReport = _parseAuditReport(row.auditReport);
  if (!auditReport) {
    return null;
  }

  const existing = auditReport.executiveManagerReport;
  if (!regenerate && isExecutiveManagerReportV1(existing)) {
    return existing;
  }

  if (row.answers === null || typeof row.answers !== "object") {
    return null;
  }
  const answersMap = parseAuditAnswersPayload(
    row.answers as Record<string, Record<string, unknown>>
  );
  if (!_hasAnyAnswers(answersMap)) {
    return null;
  }

  const fullName = `${row.lastName} ${row.firstName}`.trim();
  const context = buildExecutiveManagerReportAiContextFromAudit({
    fullName,
    answers: answersMap,
    report: auditReport,
  });

  const generated = await generateExecutiveManagerReportAi({
    context,
    sessionRef: shortSessionRef(sessionId),
  });
  if (generated === null) {
    screeningServerLog("executive_manager_report", "audit_gen_failed", {
      sessionId,
      regenerate,
    });
    return regenerate && isExecutiveManagerReportV1(existing) ? existing : null;
  }

  const nextReport: AuditReportJson = {
    ...auditReport,
    executiveManagerReport: generated,
  };
  await prisma.auditSubmission.update({
    where: { sessionId },
    data: { auditReport: nextReport as unknown as Prisma.InputJsonValue },
  });
  screeningServerLog("executive_manager_report", "audit_saved", {
    sessionId,
    regenerate,
  });
  return generated;
}

function _parseKotReport(value: unknown): KotReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<KotReportJson>;
  if (
    typeof row.rawScore !== "number" ||
    typeof row.maxScore !== "number" ||
    typeof row.kotIpLevelLabel !== "string"
  ) {
    return null;
  }
  return row as KotReportJson;
}

function _parseAuditReport(value: unknown): AuditReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<AuditReportJson>;
  if (row.version !== 1 || !row.managerBrief || !Array.isArray(row.testBlocks)) {
    return null;
  }
  return row as AuditReportJson;
}

function _hasAnyAnswers(answers: AuditAnswersMap): boolean {
  return Object.keys(answers).length > 0;
}

function _screeningFullName(step4Data: unknown, profileName: string): string {
  if (step4Data && typeof step4Data === "object") {
    const personal = (step4Data as { personal?: { lastName?: unknown; firstName?: unknown; middleName?: unknown } })
      .personal;
    if (personal) {
      const parts = [personal.lastName, personal.firstName, personal.middleName]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .map((part) => part.trim());
      if (parts.length > 0) {
        return parts.join(" ");
      }
    }
  }
  const fallback = profileName.trim();
  return fallback.length > 0 ? fallback : "Кандидат";
}
