import { Prisma } from "@/generated/prisma/client";

import { inferAuditReportProfileFromStored } from "@/lib/admin/inferAuditReportProfileFromStored";
import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";
import { rebuildManagerBriefWithPsychAi } from "@/lib/audit/report/rebuildManagerBriefWithPsychAi";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { generateScreeningReportPdfBySession } from "@/lib/admin/generateScreeningReportPdfBySession";
import {
  deleteStoredReportPdfCopies,
  loadStep4DataForAuditSession,
  rebuildAuditSubmissionReport,
} from "@/lib/admin/rebuildAuditSubmissionReport";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import type { PreviousAuditSubmissionRow } from "@/lib/audit/report/buildAuditReportData";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { computeMaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { buildMaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";
import type { MaslachBurnoutAnswers } from "@/lib/burnout/maslachBurnoutQuestions";
import type { BurnoutReportJson } from "@/lib/burnout/burnoutReportTypes";
import { countKotRawScore, getKotIpLevelLabel, getKotIpNormNote } from "@/lib/kot/kotScore";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { buildStep4AiSummary } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";
import {
  buildPendingProfSbEducationReport,
  type ProfSbEducationReportJson,
} from "@/lib/profSbEducation/profSbEducationTypes";

import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";
import type { Step1Data } from "@/store/useFormStore";

export type RegenerateStoredReportsBucketStats = {
  total: number;
  updated: number;
  pdfVerified: number;
  failed: number;
};

export type RegenerateStoredReportsError = {
  kind: "managerAssessments" | "screening" | "burnout" | "profSbEducation";
  sessionId: string;
  message: string;
};

export type RegenerateStoredReportsResult = {
  /** ОД / кадровый резерв, ТУ / шефы, скрининг-кандидат (таблица audit_submission). */
  managerAssessments: RegenerateStoredReportsBucketStats & { managerPdfVerified: number };
  screening: RegenerateStoredReportsBucketStats;
  profSbEducation: Omit<RegenerateStoredReportsBucketStats, "pdfVerified"> & {
    pdfVerified: number;
  };
  burnout: Omit<RegenerateStoredReportsBucketStats, "pdfVerified"> & { pdfVerified: number };
  deletedFolderPdfCopies: number;
  errors: ReadonlyArray<RegenerateStoredReportsError>;
};

type AssesseeReportSnapshot = {
  sessionId: string;
  createdAt: Date;
  report: AuditReportJson;
};

/**
 * Пересобирает сохранённые JSON отчётов по актуальным шаблонам (ОД/ТУ/скрининг, ПРОФ СБ, выгорание).
 */
export async function regenerateAllStoredReports(): Promise<RegenerateStoredReportsResult> {
  const errors: RegenerateStoredReportsError[] = [];
  let deletedFolderPdfCopies = 0;

  const managerStats = { total: 0, updated: 0, pdfVerified: 0, managerPdfVerified: 0, failed: 0 };
  const screeningStats = { total: 0, updated: 0, pdfVerified: 0, failed: 0 };
  const profSbStats = { total: 0, updated: 0, pdfVerified: 0, failed: 0 };
  const burnoutStats = { total: 0, updated: 0, pdfVerified: 0, failed: 0 };

  const auditRows = await prisma.auditSubmission.findMany({
    orderBy: { createdAt: "asc" },
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

  const lastReportByAssessee = new Map<string, AssesseeReportSnapshot>();

  for (const row of auditRows) {
    managerStats.total += 1;
    try {
      const answersMap = parseAuditAnswersPayload(
        row.answers as Record<string, Record<string, unknown>>
      );
      const stored = parseStoredAuditReportJson(row.auditReport);
      const reportProfile = inferAuditReportProfileFromStored(stored);
      const step4Data = await loadStep4DataForAuditSession(row.sessionId);
      const previousSnapshot = lastReportByAssessee.get(row.assesseeKey);
      const previous: PreviousAuditSubmissionRow | null = previousSnapshot
        ? {
            sessionId: previousSnapshot.sessionId,
            createdAt: previousSnapshot.createdAt,
            auditReport: previousSnapshot.report,
          }
        : null;

      const report = rebuildAuditSubmissionReport({
        answers: answersMap,
        reportProfile,
        stored,
        previous,
        step4Data,
      });
      report.delivery.pdfGenerated = false;

      if (reportProfile === "od_reserve" || reportProfile === "tu_management_chef") {
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
      const { generateAuditPdfBuffer } = await import("@/lib/report/generateAuditPdf");
      try {
        const pdfBuffer = await generateAuditPdfBuffer({
          fullName,
          sessionId: row.sessionId,
          report,
        });
        if (pdfBuffer.length > 0) {
          managerStats.pdfVerified += 1;
          report.delivery.pdfGenerated = true;
        }
      } catch {
        report.delivery.pdfGenerated = false;
      }

      const { generateAuditManagerPdfBuffer } = await import("@/lib/report/generateAuditPdf");
      try {
        const managerPdfBuffer = await generateAuditManagerPdfBuffer({
          fullName,
          sessionId: row.sessionId,
          report,
        });
        if (managerPdfBuffer.length > 0) {
          managerStats.managerPdfVerified += 1;
          report.delivery.managerPdfGenerated = true;
        } else {
          report.delivery.managerPdfGenerated = false;
        }
      } catch {
        report.delivery.managerPdfGenerated = false;
      }

      await prisma.auditSubmission.update({
        where: { sessionId: row.sessionId },
        data: { auditReport: report as unknown as Prisma.InputJsonValue },
      });

      deletedFolderPdfCopies += await deleteStoredReportPdfCopies(
        row.sessionId,
        row.candidateFolderKey
      );

      lastReportByAssessee.set(row.assesseeKey, {
        sessionId: row.sessionId,
        createdAt: row.createdAt,
        report,
      });
      managerStats.updated += 1;
    } catch (err) {
      managerStats.failed += 1;
      errors.push({
        kind: "managerAssessments",
        sessionId: row.sessionId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const screeningRows = await prisma.screeningSubmission.findMany({
    select: {
      sessionId: true,
      profileName: true,
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
      kotReport: true,
      candidateFolderKey: true,
    },
  });

  for (const row of screeningRows) {
    screeningStats.total += 1;
    try {
      const step1 = row.step1Data as Step1Data;
      const rawScore = countKotRawScore(step1);
      const oldKot = _parseKotReport(row.kotReport);
      const kotReport: KotReportJson = {
        version: 4,
        rawScore,
        maxScore: KOT_STEP_QUESTION_COUNT,
        kotIp: rawScore,
        kotIpLevelLabel: getKotIpLevelLabel(rawScore),
        kotIpNormNote: getKotIpNormNote(),
        conclusionText: oldKot?.conclusionText ?? null,
        hiringRecommendations: oldKot?.hiringRecommendations ?? null,
        conclusionGeneratedAt: oldKot?.conclusionGeneratedAt ?? null,
        emailSent: oldKot?.emailSent ?? false,
        pdfAttached: false,
      };

      await prisma.screeningSubmission.update({
        where: { sessionId: row.sessionId },
        data: { kotReport: kotReport as unknown as Prisma.InputJsonValue },
      });

      const pdfAfterSave = await generateScreeningReportPdfBySession(row.sessionId);
      if (pdfAfterSave !== null && pdfAfterSave.length > 0) {
        kotReport.pdfAttached = true;
        screeningStats.pdfVerified += 1;
        await prisma.screeningSubmission.update({
          where: { sessionId: row.sessionId },
          data: { kotReport: kotReport as unknown as Prisma.InputJsonValue },
        });
      }

      deletedFolderPdfCopies += await deleteStoredReportPdfCopies(
        row.sessionId,
        row.candidateFolderKey
      );
      screeningStats.updated += 1;
    } catch (err) {
      screeningStats.failed += 1;
      errors.push({
        kind: "screening",
        sessionId: row.sessionId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const burnoutRows = await prisma.burnoutSubmission.findMany({
    select: {
      sessionId: true,
      answers: true,
      candidateFolderKey: true,
    },
  });

  for (const row of burnoutRows) {
    burnoutStats.total += 1;
    try {
      const scores = computeMaslachBurnoutScores(row.answers as MaslachBurnoutAnswers);
      const interpretation = buildMaslachBurnoutInterpretation(scores);
      const burnoutReport: BurnoutReportJson = {
        scores,
        interpretation,
        computedAt: formatMoscowNow(),
      };

      await prisma.burnoutSubmission.update({
        where: { sessionId: row.sessionId },
        data: { burnoutReport: burnoutReport as unknown as Prisma.InputJsonValue },
      });

      deletedFolderPdfCopies += await deleteStoredReportPdfCopies(
        row.sessionId,
        row.candidateFolderKey
      );
      burnoutStats.updated += 1;
    } catch (err) {
      burnoutStats.failed += 1;
      errors.push({
        kind: "burnout",
        sessionId: row.sessionId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const profSbRows = await prisma.profSbEducationSubmission.findMany({
    select: {
      sessionId: true,
      answers: true,
      candidateFolderKey: true,
    },
  });

  for (const row of profSbRows) {
    profSbStats.total += 1;
    try {
      const profReport = _rebuildProfSbEducationReport(row.answers);
      await prisma.profSbEducationSubmission.update({
        where: { sessionId: row.sessionId },
        data: { profReport: profReport as unknown as Prisma.InputJsonValue },
      });
      deletedFolderPdfCopies += await deleteStoredReportPdfCopies(
        row.sessionId,
        row.candidateFolderKey
      );
      profSbStats.updated += 1;
    } catch (err) {
      profSbStats.failed += 1;
      errors.push({
        kind: "profSbEducation",
        sessionId: row.sessionId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    managerAssessments: managerStats,
    screening: screeningStats,
    profSbEducation: profSbStats,
    burnout: burnoutStats,
    deletedFolderPdfCopies,
    errors: errors.slice(0, 50),
  };
}

function _rebuildProfSbEducationReport(answers: unknown): ProfSbEducationReportJson {
  const base = buildPendingProfSbEducationReport();
  if (answers === null || typeof answers !== "object") {
    return { ...base, computedAt: formatMoscowNow() };
  }
  const record = answers as { step4Data?: Step4Data; source?: string };
  if (record.step4Data !== undefined) {
    const summary = buildStep4AiSummary(record.step4Data);
    return {
      status: summary.trim().length > 0 ? "computed" : "pending_methodology",
      sections: ["profSb"],
      computedAt: formatMoscowNow(),
      interpretation: summary.trim().length > 0 ? summary.slice(0, 12000) : null,
    };
  }
  return { ...base, computedAt: formatMoscowNow() };
}

function _parseKotReport(value: unknown): KotReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<KotReportJson>;
  if (typeof row.rawScore !== "number") {
    return null;
  }
  return row as KotReportJson;
}
