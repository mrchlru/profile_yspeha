import { Prisma } from "@/generated/prisma/client";

import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";
import { inferAuditReportProfileFromStored } from "@/lib/admin/inferAuditReportProfileFromStored";
import {
  deleteStoredReportPdfCopies,
  loadStep4DataForAuditSession,
  rebuildAuditSubmissionReport,
} from "@/lib/admin/rebuildAuditSubmissionReport";
import { buildAuditAiPipelinePayload } from "@/lib/ai/audit/buildAuditAiPipelinePayload";
import { renderAuditHrReport } from "@/lib/ai/audit/renderAuditHrReport";
import { generateAuditConclusion } from "@/lib/ai/auditConclusion";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import { buildAuditManagerBrief } from "@/lib/audit/report/buildAuditManagerBrief";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import { rebuildManagerBriefWithPsychAi } from "@/lib/audit/report/rebuildManagerBriefWithPsychAi";
import type { PreviousAuditSubmissionRow } from "@/lib/audit/report/buildAuditReportData";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { resolveManagerBriefConclusion } from "@/lib/audit/report/resolveManagerBriefConclusion";
import { buildBurnoutPiAlertSummary } from "@/lib/burnout/burnoutPiCritical";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";

export type RegenerateAuditSubmissionOptions = {
  /** HR-синтез (report.ai: заключение, methodologyInsights). */
  withAuditHrAi?: boolean;
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
  hrAiOk?: boolean;
  managerBriefAiOk?: boolean;
};

/**
 * Пересобирает JSON отчёта аудита по сессии, при необходимости ИИ и PDF.
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

  const fullName = `${row.lastName} ${row.firstName}`.trim();
  const sessionRef = shortSessionRef(row.sessionId);

  let hrAiOk: boolean | undefined;
  let managerBriefAiOk: boolean | undefined;
  let managerBriefConclusionFromHr: string | null =
    stored?.managerBrief?.aiConclusion ?? null;

  if (options.withAuditHrAi === true) {
    const aiResult = await _regenerateAuditHrAiBlock({
      sessionId: row.sessionId,
      assesseeKey: row.assesseeKey,
      fullName,
      sessionRef,
      answersMap,
      report,
      reportProfile,
    });
    hrAiOk = aiResult.hrAiOk;
    managerBriefConclusionFromHr = aiResult.managerBriefConclusionFromHr;
  }

  const shouldRebuildOdTuManagerBrief =
    (options.withManagerBriefAi === true || options.withAuditHrAi === true) &&
    (reportProfile === "od_reserve" || reportProfile === "tu_management_chef");

  if (shouldRebuildOdTuManagerBrief) {
    const { managerBrief } = await rebuildManagerBriefWithPsychAi({
      answers: answersMap,
      testBlocks: report.testBlocks,
      narrativeSections: report.narrativeSections,
      reportProfile,
      sessionRef,
      useAi: true,
      existingAiConclusion: managerBriefConclusionFromHr,
      storedManagerBrief: stored?.managerBrief ?? null,
    });
    report.managerBrief = managerBrief;
    managerBriefAiOk = Boolean(managerBrief.aiConclusion?.trim());
  } else if (options.withAuditHrAi === true) {
    const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
    const burnoutScores = computeBurnoutScores(
      burnoutStep ? answersMap[burnoutStep.stepIndex] : undefined
    );
    const managerConclusionForBrief = resolveManagerBriefConclusion(
      answersMap,
      reportProfile,
      managerBriefConclusionFromHr
    );
    report.managerBrief = buildAuditManagerBrief(
      report.testBlocks,
      report.narrativeSections,
      managerConclusionForBrief,
      burnoutScores,
      answersMap,
      report.reportProfile
    );
  }

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
  if (hrAiOk === true) {
    parts.push("ИИ-заключение HR пересобрано");
  } else if (hrAiOk === false) {
    parts.push("ИИ-заключение HR не удалось сгенерировать");
  }
  if (managerBriefAiOk === true) {
    parts.push("блок для руководителя (ИИ) обновлён");
  } else if (managerBriefAiOk === false) {
    parts.push("ИИ для блока руководителя не ответил");
  }
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
    hrAiOk,
    managerBriefAiOk,
  };
}

async function _regenerateAuditHrAiBlock(input: {
  sessionId: string;
  assesseeKey: string;
  fullName: string;
  sessionRef: string;
  answersMap: ReturnType<typeof parseAuditAnswersPayload>;
  report: AuditReportJson;
  reportProfile: AuditReportProfile;
}): Promise<{ hrAiOk: boolean; managerBriefConclusionFromHr: string | null }> {
  const pipelinePayload = buildAuditAiPipelinePayload({
    fullName: input.fullName,
    sessionId: input.sessionId,
    assesseeKey: input.assesseeKey,
    answers: input.answersMap,
    report: input.report,
    reportProfile: input.reportProfile,
  });

  const ai = await generateAuditConclusion({
    pipelinePayload,
    sessionRef: input.sessionRef,
  });

  if (ai.structured === null) {
    return { hrAiOk: false, managerBriefConclusionFromHr: null };
  }

  const conclusion = renderAuditHrReport(ai.structured, input.report.conclusion).slice(0, 24000);
  input.report.ai = {
    conclusion,
    yearOverYearDynamics: ai.yearOverYearDynamics,
    generatedAt: formatMoscowNow(),
    structured: ai.structured,
  };

  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnoutScores = computeBurnoutScores(
    burnoutStep ? input.answersMap[burnoutStep.stepIndex] : undefined
  );
  input.report.burnoutPiAlert = buildBurnoutPiAlertSummary(burnoutScores);

  const managerBriefConclusionFromHr = ai.structured.managerBriefConclusion ?? null;
  return { hrAiOk: true, managerBriefConclusionFromHr };
}
