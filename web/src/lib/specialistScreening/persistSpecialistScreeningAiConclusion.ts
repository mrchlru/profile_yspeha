import { Prisma } from "@/generated/prisma/client";

import { buildSpecialistScreeningConclusionContext } from "@/lib/ai/buildSpecialistScreeningConclusionContext";
import { generateSpecialistScreeningConclusion } from "@/lib/ai/generateSpecialistScreeningConclusion";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";
import type { SpecialistScreeningReportJson } from "@/lib/specialistScreening/specialistScreeningReportTypes";

export type PersistSpecialistScreeningAiConclusionResult = {
  conclusionText: string | null;
  managerActions: string | null;
  conclusionGeneratedAt: string | null;
  report: SpecialistScreeningReportJson | null;
  aiGenerated: boolean;
};

/**
 * Генерирует заключение ИИ по скринингу и сохраняет в specialistScreeningReport.
 */
export async function persistSpecialistScreeningAiConclusion(input: {
  sessionId: string;
  sessionRef: string;
  personName: string;
}): Promise<PersistSpecialistScreeningAiConclusionResult> {
  const row = await prisma.specialistScreeningSubmission.findUnique({
    where: { sessionId: input.sessionId },
    select: { specialistScreeningReport: true },
  });
  if (!row?.specialistScreeningReport || typeof row.specialistScreeningReport !== "object") {
    return {
      conclusionText: null,
      managerActions: null,
      conclusionGeneratedAt: null,
      report: null,
      aiGenerated: false,
    };
  }

  const report = row.specialistScreeningReport as unknown as SpecialistScreeningReportJson;
  if (!report.scores || !report.interpretation) {
    return {
      conclusionText: null,
      managerActions: null,
      conclusionGeneratedAt: null,
      report: null,
      aiGenerated: false,
    };
  }

  const screeningContext = buildSpecialistScreeningConclusionContext({
    personName: input.personName,
    scores: report.scores,
    interpretation: report.interpretation,
  });

  const aiResult = await generateSpecialistScreeningConclusion({
    screeningContext,
    sessionRef: input.sessionRef,
  });

  if (aiResult.conclusionText === null) {
    return {
      conclusionText: report.conclusionText ?? null,
      managerActions: report.managerActions ?? null,
      conclusionGeneratedAt: report.conclusionGeneratedAt ?? null,
      report,
      aiGenerated: false,
    };
  }

  const conclusionGeneratedAt = formatMoscowNow();
  const nextReport: SpecialistScreeningReportJson = {
    ...report,
    conclusionText: aiResult.conclusionText,
    managerActions: aiResult.managerActions,
    conclusionGeneratedAt,
  };

  await prisma.specialistScreeningSubmission.update({
    where: { sessionId: input.sessionId },
    data: {
      specialistScreeningReport: nextReport as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    conclusionText: aiResult.conclusionText,
    managerActions: aiResult.managerActions,
    conclusionGeneratedAt,
    report: nextReport,
    aiGenerated: true,
  };
}
