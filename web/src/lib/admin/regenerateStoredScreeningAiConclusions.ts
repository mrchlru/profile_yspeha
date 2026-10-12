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
import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import { buildAuditManagerBrief } from "@/lib/audit/report/buildAuditManagerBrief";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { resolveManagerBriefConclusion } from "@/lib/audit/report/resolveManagerBriefConclusion";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import { buildBurnoutPiAlertSummary } from "@/lib/burnout/burnoutPiCritical";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";

export type RegenerateScreeningAiResult = {
  totalAuditRows: number;
  eligible: number;
  updated: number;
  skippedProfile: number;
  skippedHasConclusion: number;
  skippedInvalid: number;
  failed: number;
  errors: ReadonlyArray<{ sessionId: string; message: string }>;
  processedSessionIds: ReadonlyArray<string>;
};

export type RegenerateScreeningAiBatchResult = RegenerateScreeningAiResult & {
  hasMore: boolean;
  nextAfterSessionId: string | null;
  batchEligibleProcessed: number;
};

export type RegenerateScreeningAiOptions = {
  /** Перегенерировать даже если заключение уже есть. */
  forceAll?: boolean;
  batchSize?: number;
  afterSessionId?: string | null;
  sessionIds?: ReadonlyArray<string>;
};

/**
 * Перегенерирует ИИ-заключение для сохранённых прохождений скрининга кандидата.
 */
export async function regenerateStoredScreeningAiConclusions(
  options: RegenerateScreeningAiOptions = {}
): Promise<RegenerateScreeningAiBatchResult> {
  const forceAll = options.forceAll === true;
  const batchSize = _clampBatchSize(options.batchSize);
  const afterSessionId = options.afterSessionId?.trim() || null;
  const targetSessionIds = new Set(
    (options.sessionIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0)
  );
  const targetedMode = targetSessionIds.size > 0;
  const isFirstBatch = afterSessionId === null && !targetedMode;

  const errors: { sessionId: string; message: string }[] = [];
  const processedSessionIds: string[] = [];
  let eligible = 0;
  let updated = 0;
  let skippedProfile = 0;
  let skippedHasConclusion = 0;
  let skippedInvalid = 0;
  let failed = 0;
  let batchEligibleProcessed = 0;
  let nextAfterSessionId: string | null = null;
  let hasMore = false;
  let totalAuditRows = 0;

  const rows = await prisma.auditSubmission.findMany({
    where: { auditReport: { not: Prisma.DbNull } },
    orderBy: { sessionId: "asc" },
    select: {
      sessionId: true,
      assesseeKey: true,
      createdAt: true,
      answers: true,
      auditReport: true,
      candidateFolderKey: true,
      firstName: true,
      lastName: true,
    },
  });

  if (isFirstBatch) {
    totalAuditRows = rows.length;
  }

  for (const row of rows) {
    if (targetedMode && !targetSessionIds.has(row.sessionId)) {
      continue;
    }
    if (!targetedMode && afterSessionId !== null && row.sessionId <= afterSessionId) {
      continue;
    }

    const stored = parseStoredAuditReportJson(row.auditReport);
    if (!stored) {
      skippedInvalid += 1;
      continue;
    }

    const answersMap = parseAuditAnswersPayload(
      row.answers as Record<string, Record<string, unknown>>
    );
    const reportProfile = _resolveScreeningProfile(stored, answersMap);
    if (reportProfile !== "candidate_screening") {
      skippedProfile += 1;
      continue;
    }

    if (!forceAll && _hasAiConclusion(stored)) {
      skippedHasConclusion += 1;
      continue;
    }

    if (!targetedMode && batchEligibleProcessed >= batchSize) {
      hasMore = true;
      break;
    }

    eligible += 1;
    batchEligibleProcessed += 1;
    nextAfterSessionId = row.sessionId;

    try {
      const previousRow = await prisma.auditSubmission.findFirst({
        where: {
          assesseeKey: row.assesseeKey,
          createdAt: { lt: row.createdAt },
        },
        orderBy: { createdAt: "desc" },
        select: {
          sessionId: true,
          createdAt: true,
          auditReport: true,
        },
      });
      const step4Data = await loadStep4DataForAuditSession(row.sessionId);
      const report = rebuildAuditSubmissionReport({
        answers: answersMap,
        reportProfile,
        stored,
        previous: previousRow
          ? {
              sessionId: previousRow.sessionId,
              createdAt: previousRow.createdAt,
              auditReport: previousRow.auditReport,
            }
          : null,
        step4Data,
      });

      const fullName = `${row.lastName} ${row.firstName}`.trim();
      const sessionRef = shortSessionRef(row.sessionId);
      const pipelinePayload = buildAuditAiPipelinePayload({
        fullName,
        sessionId: row.sessionId,
        assesseeKey: row.assesseeKey,
        answers: answersMap,
        report,
        reportProfile,
      });

      const ai = await generateAuditConclusion({ pipelinePayload, sessionRef });
      if (ai.structured === null) {
        failed += 1;
        errors.push({
          sessionId: row.sessionId,
          message: "Модель не вернула заключение",
        });
        processedSessionIds.push(row.sessionId);
        continue;
      }

      const conclusion = renderAuditHrReport(ai.structured, report.conclusion).slice(0, 24000);
      report.ai = {
        conclusion,
        yearOverYearDynamics: ai.yearOverYearDynamics,
        generatedAt: formatMoscowNow(),
        structured: ai.structured,
      };

      const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
      const burnoutScores = computeBurnoutScores(
        burnoutStep ? answersMap[burnoutStep.stepIndex] : undefined
      );
      report.burnoutPiAlert = buildBurnoutPiAlertSummary(burnoutScores);

      const managerConclusionForBrief = resolveManagerBriefConclusion(
        answersMap,
        reportProfile,
        ai.structured.managerBriefConclusion ?? null
      );
      report.managerBrief = buildAuditManagerBrief(
        report.testBlocks,
        report.narrativeSections,
        managerConclusionForBrief,
        burnoutScores,
        answersMap,
        reportProfile
      );

      await prisma.auditSubmission.update({
        where: { sessionId: row.sessionId },
        data: {
          auditReport: report as unknown as Prisma.InputJsonValue,
        },
      });

      await deleteStoredReportPdfCopies(row.sessionId, row.candidateFolderKey);
      updated += 1;
      processedSessionIds.push(row.sessionId);
    } catch (err) {
      failed += 1;
      errors.push({
        sessionId: row.sessionId,
        message: err instanceof Error ? err.message : "unknown",
      });
      processedSessionIds.push(row.sessionId);
    }
  }

  return {
    totalAuditRows,
    eligible,
    updated,
    skippedProfile,
    skippedHasConclusion,
    skippedInvalid,
    failed,
    errors: errors.slice(0, 50),
    processedSessionIds,
    hasMore,
    nextAfterSessionId,
    batchEligibleProcessed,
  };
}

function _resolveScreeningProfile(
  stored: AuditReportJson,
  answers: AuditAnswersMap
): AuditReportProfile {
  void answers;
  const inferred = stored.reportProfile ?? inferAuditReportProfileFromStored(stored);
  return inferred;
}

function _hasAiConclusion(stored: AuditReportJson): boolean {
  const hr = stored.ai?.conclusion?.trim() ?? "";
  const manager = stored.managerBrief?.aiConclusion?.trim() ?? "";
  return hr.length > 0 || manager.length > 0;
}

function _clampBatchSize(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) {
    return 2;
  }
  return Math.min(10, Math.max(1, Math.floor(raw)));
}
