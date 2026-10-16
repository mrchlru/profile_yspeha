import { Prisma } from "@/generated/prisma/client";

import { deleteStoredReportPdfCopies } from "@/lib/admin/rebuildAuditSubmissionReport";
import { generateScreeningReportPdfBySession } from "@/lib/admin/generateScreeningReportPdfBySession";
import { countKotRawScore, getKotIpLevelLabel, getKotIpNormNote } from "@/lib/kot/kotScore";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { prisma } from "@/lib/prisma";
import type { Step1Data } from "@/store/useFormStore";

export type RegenerateScreeningSubmissionResult = {
  ok: boolean;
  message: string;
  pdfOk?: boolean;
};

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

/**
 * Пересобирает kotReport и PDF скрининга по sessionId.
 */
export async function regenerateScreeningSubmissionBySession(
  sessionId: string
): Promise<RegenerateScreeningSubmissionResult> {
  const row = await prisma.screeningSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      step1Data: true,
      kotReport: true,
      candidateFolderKey: true,
    },
  });

  if (!row) {
    return { ok: false, message: "Сессия скрининга не найдена" };
  }

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

  const pdfBuffer = await generateScreeningReportPdfBySession(row.sessionId);
  const pdfOk = pdfBuffer !== null && pdfBuffer.length > 0;
  if (pdfOk) {
    kotReport.pdfAttached = true;
    await prisma.screeningSubmission.update({
      where: { sessionId: row.sessionId },
      data: { kotReport: kotReport as unknown as Prisma.InputJsonValue },
    });
  }

  await deleteStoredReportPdfCopies(row.sessionId, row.candidateFolderKey);

  return {
    ok: true,
    message: pdfOk ? "Отчёт скрининга и PDF обновлены" : "JSON обновлён; PDF не удалось сформировать",
    pdfOk,
  };
}
