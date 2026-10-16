import { Prisma } from "@/generated/prisma/client";

import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";
import { inferAuditReportProfileFromStored } from "@/lib/admin/inferAuditReportProfileFromStored";
import {
  deleteStoredReportPdfCopies,
  loadStep4DataForAuditSession,
  rebuildAuditSubmissionReport,
} from "@/lib/admin/rebuildAuditSubmissionReport";
import { rebuildManagerBriefWithPsychAi } from "@/lib/audit/report/rebuildManagerBriefWithPsychAi";
import type { PreviousAuditSubmissionRow } from "@/lib/audit/report/buildAuditReportData";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";

export type RegenerateAuditSubmissionOptions = {
  /** Пересобрать блок managerBrief с ИИ (ОД / ТУ). */
  withManagerBriefAi?: boolean;
  withFullPdf?: boolean;
  withManagerPdf?: boolean;
};

export type RegenerateAuditSubmissionResult = {
  ok: boolean;
  message: string;
  fullPdfOk?: boolean;
  managerPdfOk?: boolean;
};

/**
 * Пересобирает JSON отчёта аудита по сессии и при необходимости PDF.
 */
export async function regenerateAuditSubmissionBySession(
  sessionId: string,
  options: RegenerateAuditSubmissionOptions = {}
): Promise<RegenerateAuditSubmissionResult> {
  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      assesseeKey: true,
      createdAt: true,
      answers: true,
      auditReport: true,
      firstName: true,
      lastName: true,
      candidateFolderKey: true,
    },
  });

  if (!row) {
    return { ok: false, message: "Сессия аудита не найдена" };
  }

  const answersMap = parseAuditAnswersPayload(
    row.answers as Record<string, Record<string, unknown>>
  );
  const stored = parseStoredAuditReportJson(row.auditReport);
  const reportProfile = inferAuditReportProfileFromStored(stored);
  const step4Data = await loadStep4DataForAuditSession(row.sessionId);

  const previousRow = await prisma.auditSubmission.findFirst({
    where: {
      assesseeKey: row.assesseeKey,
      createdAt: { lt: row.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: { sessionId: true, createdAt: true, auditReport: true },
  });

  const previousParsed =
    previousRow !== null ? parseStoredAuditReportJson(previousRow.auditReport) : null;
  const previousValid: PreviousAuditSubmissionRow | null =
    previousRow !== null && previousParsed !== null
      ? {
          sessionId: previousRow.sessionId,
          createdAt: previousRow.createdAt,
          auditReport: previousParsed,
        }
      : null;

  const report = rebuildAuditSubmissionReport({
    answers: answersMap,
    reportProfile,
    stored,
    previous: previousValid,
    step4Data,
  });
  report.delivery.pdfGenerated = false;
  report.delivery.managerPdfGenerated = false;

  if (
    options.withManagerBriefAi === true &&
    (reportProfile === "od_reserve" || reportProfile === "tu_management_chef")
  ) {
    const { managerBrief } = await rebuildManagerBriefWithPsychAi({
      answers: answersMap,
      testBlocks: report.testBlocks,
      narrativeSections: report.narrativeSections,
      reportProfile,
      sessionRef: shortSessionRef(row.sessionId),
      useAi: true,
      existingAiConclusion: stored?.managerBrief?.aiConclusion ?? null,
      storedManagerBrief: stored?.managerBrief ?? null,
    });
    report.managerBrief = managerBrief;
  }

  const fullName = `${row.lastName} ${row.firstName}`.trim();
  let fullPdfOk: boolean | undefined;
  let managerPdfOk: boolean | undefined;

  if (options.withFullPdf === true) {
    const { generateAuditPdfBuffer } = await import("@/lib/report/generateAuditPdf");
    try {
      const pdfBuffer = await generateAuditPdfBuffer({
        fullName,
        sessionId: row.sessionId,
        report,
      });
      fullPdfOk = pdfBuffer.length > 0;
      report.delivery.pdfGenerated = fullPdfOk;
    } catch {
      fullPdfOk = false;
      report.delivery.pdfGenerated = false;
    }
  }

  if (options.withManagerPdf === true) {
    const { generateAuditManagerPdfBuffer } = await import("@/lib/report/generateAuditPdf");
    try {
      const managerPdfBuffer = await generateAuditManagerPdfBuffer({
        fullName,
        sessionId: row.sessionId,
        report,
      });
      managerPdfOk = managerPdfBuffer.length > 0;
      report.delivery.managerPdfGenerated = managerPdfOk;
    } catch {
      managerPdfOk = false;
      report.delivery.managerPdfGenerated = false;
    }
  }

  await prisma.auditSubmission.update({
    where: { sessionId: row.sessionId },
    data: { auditReport: report as unknown as Prisma.InputJsonValue },
  });

  await deleteStoredReportPdfCopies(row.sessionId, row.candidateFolderKey);

  const parts: string[] = ["JSON отчёта обновлён"];
  if (fullPdfOk === true) {
    parts.push("полный PDF сформирован");
  } else if (fullPdfOk === false) {
    parts.push("полный PDF не удалось сформировать");
  }
  if (managerPdfOk === true) {
    parts.push("PDF для руководителя сформирован");
  } else if (managerPdfOk === false) {
    parts.push("PDF для руководителя не удалось сформировать");
  }

  return {
    ok: true,
    message: parts.join("; "),
    fullPdfOk,
    managerPdfOk,
  };
}
