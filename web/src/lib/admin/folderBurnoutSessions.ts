import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { buildMaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";
import type { BurnoutReportJson } from "@/lib/burnout/burnoutReportTypes";
import { prisma } from "@/lib/prisma";

export type FolderBurnoutSessionRef = {
  sessionId: string;
  label: string;
  createdAt: string;
  classicBurnout: boolean;
  hasConcerningScale: boolean;
};

/**
 * Возвращает прохождения теста Маслач, привязанные к папке кандидата.
 */
export async function listFolderBurnoutSessions(
  folderKey: string
): Promise<FolderBurnoutSessionRef[]> {
  const rows = await prisma.burnoutSubmission.findMany({
    where: { candidateFolderKey: folderKey },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      lastName: true,
      firstName: true,
      burnoutReport: true,
    },
  });

  return rows.map((row) => {
    const report = row.burnoutReport as BurnoutReportJson | null;
    const interpretation =
      report?.interpretation ??
      (report?.scores ? buildMaslachBurnoutInterpretation(report.scores) : null);
    const classicBurnout = interpretation?.classicBurnout === true;
    const hasConcerningScale =
      interpretation !== null &&
      interpretation !== undefined &&
      (interpretation.ee.unfavorable ||
        interpretation.dp.unfavorable ||
        interpretation.pa.unfavorable);

    return {
      sessionId: row.sessionId,
      label: `${row.lastName} ${row.firstName} — ${formatMoscowDateTime(row.createdAt)}`,
      createdAt: row.createdAt.toISOString(),
      classicBurnout,
      hasConcerningScale,
    };
  });
}
