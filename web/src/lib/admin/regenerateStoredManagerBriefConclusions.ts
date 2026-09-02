import { Prisma } from "@/generated/prisma/client";



import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";

import { inferAuditReportProfileFromStored } from "@/lib/admin/inferAuditReportProfileFromStored";

import {

  deleteStoredReportPdfCopies,

  loadStep4DataForAuditSession,

  rebuildAuditSubmissionReport,

} from "@/lib/admin/rebuildAuditSubmissionReport";

import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import {
  hasRukavishnikovBurnoutAnswers,
  isLegacyConcatenatedPsychBriefText,
  rebuildManagerBriefWithPsychAi,
} from "@/lib/audit/report/rebuildManagerBriefWithPsychAi";
import { OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX } from "@/lib/audit/report/resolveOdReservePsychologicalState";

import { shortSessionRef } from "@/lib/logging/screeningSessionRef";

import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";

import { prisma } from "@/lib/prisma";



export type RegenerateManagerBriefResult = {

  totalAuditRows: number;

  eligible: number;

  updated: number;

  skippedProfile: number;

  skippedInvalid: number;

  failed: number;

  errors: ReadonlyArray<{ sessionId: string; message: string }>;

  processedSessionIds: ReadonlyArray<string>;

};



export type RegenerateManagerBriefBatchResult = RegenerateManagerBriefResult & {

  hasMore: boolean;

  nextAfterSessionId: string | null;

  /** Сколько подходящих ОД/ТУ записей обработано в этом запросе. */

  batchEligibleProcessed: number;

};



const MANAGER_BRIEF_PROFILES: ReadonlySet<AuditReportProfile> = new Set([

  "od_reserve",

  "tu_management_chef",

]);

/** Пункт «Психологическое состояние» — маркер OD-блока для руководителя. */
const OD_PSYCH_MANAGER_BRIEF_TITLE = "Психологическое состояние";

/**
 * Восстанавливает профиль для пересборки managerBrief (в т.ч. старые отчёты без reportProfile).
 */
function resolveManagerBriefRegenerationProfile(
  stored: NonNullable<ReturnType<typeof parseStoredAuditReportJson>>,
  answers: AuditAnswersMap
): AuditReportProfile | null {
  if (!hasRukavishnikovBurnoutAnswers(answers)) {
    return null;
  }

  const inferred = stored.reportProfile ?? inferAuditReportProfileFromStored(stored);
  if (MANAGER_BRIEF_PROFILES.has(inferred)) {
    return inferred;
  }

  const hasOdPsychLine = (stored.managerBrief?.testLines ?? []).some(
    (line) =>
      line.title.trim() === OD_PSYCH_MANAGER_BRIEF_TITLE ||
      line.title.includes("Психологическое состояние") ||
      line.blockIndex === 5
  );
  if (hasOdPsychLine) {
    return inferred === "full_state_audit" ? "od_reserve" : inferred;
  }

  const legacyPsychLine = (stored.managerBrief?.testLines ?? []).find(
    (line) =>
      line.title.includes("Психологическое состояние") ||
      line.blockIndex === OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX
  );
  if (
    legacyPsychLine !== undefined &&
    isLegacyConcatenatedPsychBriefText(legacyPsychLine.briefAnswer)
  ) {
    return inferred === "full_state_audit" ? "od_reserve" : inferred;
  }

  return null;
}



export type RegenerateManagerBriefOptions = {

  useAi?: boolean;

  /** Обработать не более N подходящих записей за один HTTP-запрос (для длинных прогонов с ИИ). */

  batchSize?: number;

  /** Курсор: обрабатывать только sessionId строго после этого значения. */

  afterSessionId?: string | null;

  /** Явный список сессий (пересборка только их, без курсора). */

  sessionIds?: ReadonlyArray<string>;

};



/**

 * Пересобирает полный JSON отчёта (narrative, testBlocks, метрики) и блок managerBrief для ОД / ТУ.

 */

export async function regenerateStoredManagerBriefConclusions(

  options: RegenerateManagerBriefOptions = {}

): Promise<RegenerateManagerBriefBatchResult> {

  const useAi = options.useAi === true;

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

  let skippedInvalid = 0;

  let failed = 0;

  let batchEligibleProcessed = 0;

  let nextAfterSessionId: string | null = null;

  let hasMore = false;



  const rows = await prisma.auditSubmission.findMany({

    where: { auditReport: { not: Prisma.DbNull } },

    orderBy: { createdAt: "asc" },

    select: {

      sessionId: true,

      assesseeKey: true,

      createdAt: true,

      answers: true,

      auditReport: true,

      candidateFolderKey: true,

    },

  });



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

    const reportProfile = resolveManagerBriefRegenerationProfile(stored, answersMap);

    if (reportProfile === null) {

      skippedProfile += 1;

      continue;

    }



    if (!targetedMode && batchSize !== null && batchEligibleProcessed >= batchSize) {

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



      const sessionRef = shortSessionRef(row.sessionId);

      const { managerBrief } = await rebuildManagerBriefWithPsychAi({

        answers: answersMap,

        testBlocks: report.testBlocks,

        narrativeSections: report.narrativeSections,

        reportProfile,

        sessionRef,

        useAi,

        existingAiConclusion: stored?.managerBrief?.aiConclusion ?? null,

        storedManagerBrief: stored?.managerBrief ?? null,

      });

      report.managerBrief = managerBrief;



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

      const message = err instanceof Error ? err.message : String(err);

      if (errors.length < 50) {

        errors.push({

          sessionId: row.sessionId,

          message: message.slice(0, 300),

        });

      }

    }

  }



  return {

    totalAuditRows: isFirstBatch ? rows.length : 0,

    eligible,

    updated,

    skippedProfile: isFirstBatch ? skippedProfile : 0,

    skippedInvalid: isFirstBatch ? skippedInvalid : 0,

    failed,

    errors,

    processedSessionIds,

    hasMore,

    nextAfterSessionId: hasMore ? nextAfterSessionId : null,

    batchEligibleProcessed,

  };

}



function _clampBatchSize(batchSize: number | undefined): number | null {

  if (batchSize === undefined || batchSize === null) {

    return null;

  }

  if (!Number.isFinite(batchSize)) {

    return 3;

  }

  return Math.min(15, Math.max(1, Math.floor(batchSize)));

}


