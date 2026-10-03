import type { SpecialistScreeningReportJson } from "@/lib/specialistScreening/specialistScreeningReportTypes";
import { computeSpecialistScreeningScores } from "@/lib/specialistScreening/computeSpecialistScreeningScores";
import { buildSpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import type { SpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import type { SpecialistScreeningAnswers } from "@/lib/specialistScreening/specialistScreeningQuestions";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

export type SpecialistScreeningReportView = {
  sessionId: string;
  personName: string;
  folderKey: string | null;
  createdAt: string;
  computedAt: string | null;
  interpretation: SpecialistScreeningInterpretation;
  referralSuggested: boolean;
  phq9Item9Positive: boolean;
  conclusionText: string | null;
  managerActions: string | null;
  conclusionGeneratedAt: string | null;
};

/**
 * Загружает и нормализует отчёт скрининга для просмотра в админке.
 */
export async function buildSpecialistScreeningReportView(
  sessionId: string
): Promise<SpecialistScreeningReportView | null> {
  const row = await prisma.specialistScreeningSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
      specialistScreeningReport: true,
      answers: true,
    },
  });
  if (!row) {
    return null;
  }

  const report = _resolveReport(row.specialistScreeningReport, row.answers);
  if (!report?.interpretation) {
    return null;
  }

  return {
    sessionId: row.sessionId,
    personName: `${row.lastName} ${row.firstName}`,
    folderKey: row.candidateFolderKey,
    createdAt: row.createdAt.toISOString(),
    computedAt: report.computedAt,
    interpretation: report.interpretation,
    referralSuggested: report.interpretation.referralSuggested,
    phq9Item9Positive: report.interpretation.phq9Item9Positive,
    conclusionText: report.conclusionText ?? null,
    managerActions: report.managerActions ?? null,
    conclusionGeneratedAt: report.conclusionGeneratedAt ?? null,
  };
}

/**
 * Проверяет, что сессия принадлежит папке сотрудника.
 */
export async function assertSpecialistScreeningSessionInFolder(
  folderKey: string,
  sessionId: string
): Promise<boolean> {
  const row = await prisma.specialistScreeningSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { sessionId: true },
  });
  return row !== null;
}

function _resolveReport(
  stored: unknown,
  answers: unknown
): SpecialistScreeningReportJson | null {
  if (stored && typeof stored === "object") {
    const report = stored as SpecialistScreeningReportJson;
    if (report.interpretation) {
      return {
        ...report,
        conclusionText: report.conclusionText ?? null,
        managerActions: report.managerActions ?? null,
        conclusionGeneratedAt: report.conclusionGeneratedAt ?? null,
      };
    }
    if (report.scores) {
      const interpretation = buildSpecialistScreeningInterpretation(report.scores);
      return {
        ...report,
        interpretation,
        conclusionText: report.conclusionText ?? null,
        managerActions: report.managerActions ?? null,
        conclusionGeneratedAt: report.conclusionGeneratedAt ?? null,
      };
    }
  }

  if (!answers || typeof answers !== "object") {
    return null;
  }

  const scores = computeSpecialistScreeningScores(answers as SpecialistScreeningAnswers);
  const interpretation = buildSpecialistScreeningInterpretation(scores);
  if (!interpretation) {
    return null;
  }

  return {
    scores,
    interpretation,
    computedAt: formatMoscowDateTime(new Date()),
    conclusionText: null,
    managerActions: null,
    conclusionGeneratedAt: null,
  };
}
