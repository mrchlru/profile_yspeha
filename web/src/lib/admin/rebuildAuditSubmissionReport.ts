import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import {
  buildAuditReportJson,
  type PreviousAuditSubmissionRow,
} from "@/lib/audit/report/buildAuditReportData";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import type { Step4Data } from "@/lib/step4/step4Types";
import { prisma } from "@/lib/prisma";

export type RebuildAuditSubmissionReportInput = {
  answers: AuditAnswersMap;
  reportProfile: AuditReportProfile;
  stored: AuditReportJson | null;
  previous: PreviousAuditSubmissionRow | null;
  step4Data?: Step4Data;
};

/**
 * Пересобирает JSON отчёта аудита по ответам и сохраняет блок ИИ из предыдущей версии.
 */
export function rebuildAuditSubmissionReport(
  input: RebuildAuditSubmissionReportInput
): AuditReportJson {
  const aiDraft = input.stored?.ai ?? {
    conclusion: null,
    yearOverYearDynamics: null,
    generatedAt: null,
    structured: null,
  };
  const deliveryDraft = {
    emailSent: input.stored?.delivery.emailSent ?? false,
    pdfGenerated: input.stored?.delivery.pdfGenerated ?? false,
    managerPdfGenerated: input.stored?.delivery.managerPdfGenerated ?? false,
  };

  const report = buildAuditReportJson({
    answers: input.answers,
    previous: input.previous,
    aiDraft,
    deliveryDraft,
    reportProfile: input.reportProfile,
    step4Data: input.step4Data,
  });

  if (input.stored?.ai) {
    report.ai = { ...input.stored.ai };
  }

  return report;
}

/**
 * Загружает анкету ПРОФ СБ (step-4) для сессии аудита, если она есть.
 */
export async function loadStep4DataForAuditSession(
  sessionId: string
): Promise<Step4Data | undefined> {
  const row = await prisma.profSbEducationSubmission.findUnique({
    where: { sessionId },
    select: { answers: true },
  });
  if (row === null || row.answers === null || typeof row.answers !== "object") {
    return undefined;
  }
  const answers = row.answers as { step4Data?: Step4Data };
  return answers.step4Data;
}

/**
 * Удаляет устаревшие PDF-копии отчёта в папке сотрудника.
 */
export async function deleteStoredReportPdfCopies(
  sessionId: string,
  folderKey: string | null
): Promise<number> {
  if (folderKey === null || folderKey.trim().length === 0) {
    return 0;
  }
  const fileNames = [
    `report-${sessionId}.pdf`,
    `audit-report-${sessionId}.pdf`,
    `manager-report-${sessionId}.pdf`,
    `screening-report-${sessionId}.pdf`,
  ];
  const result = await prisma.employeeFolderFile.deleteMany({
    where: {
      folderKey,
      fileName: { in: fileNames },
    },
  });
  return result.count;
}
