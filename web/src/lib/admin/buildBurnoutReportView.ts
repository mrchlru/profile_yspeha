import type { BurnoutReportJson } from "@/lib/burnout/burnoutReportTypes";
import { computeMaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { buildMaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";
import type { MaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

export type BurnoutReportView = {
  sessionId: string;
  personName: string;
  folderKey: string | null;
  createdAt: string;
  computedAt: string | null;
  interpretation: MaslachBurnoutInterpretation;
  classicBurnout: boolean;
};

/**
 * Загружает и нормализует отчёт теста Маслач для просмотра в админке.
 */
export async function buildBurnoutReportView(
  sessionId: string
): Promise<BurnoutReportView | null> {
  const row = await prisma.burnoutSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      candidateFolderKey: true,
      burnoutReport: true,
      answers: true,
    },
  });
  if (!row) {
    return null;
  }

  const report = _resolveBurnoutReport(row.burnoutReport, row.answers);
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
    classicBurnout: report.interpretation.classicBurnout,
  };
}

/**
 * Проверяет, что сессия теста на выгорание принадлежит папке сотрудника.
 */
export async function assertBurnoutSessionInFolder(
  folderKey: string,
  sessionId: string
): Promise<boolean> {
  const row = await prisma.burnoutSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { sessionId: true },
  });
  return row !== null;
}

function _resolveBurnoutReport(
  stored: unknown,
  answers: unknown
): BurnoutReportJson | null {
  if (stored && typeof stored === "object") {
    const report = stored as BurnoutReportJson;
    if (report.interpretation) {
      return report;
    }
    if (report.scores) {
      const interpretation = buildMaslachBurnoutInterpretation(report.scores);
      return { ...report, interpretation };
    }
  }

  if (!answers || typeof answers !== "object") {
    return null;
  }

  const scores = computeMaslachBurnoutScores(
    answers as Parameters<typeof computeMaslachBurnoutScores>[0]
  );
  const interpretation = buildMaslachBurnoutInterpretation(scores);
  if (!interpretation) {
    return null;
  }

  return {
    scores,
    interpretation,
    computedAt: formatMoscowDateTime(new Date()),
  };
}
