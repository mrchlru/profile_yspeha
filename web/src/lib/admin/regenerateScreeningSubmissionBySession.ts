import { Prisma } from "@/generated/prisma/client";

import { deleteStoredReportPdfCopies } from "@/lib/admin/rebuildAuditSubmissionReport";
import { generateScreeningReportPdfBySession } from "@/lib/admin/generateScreeningReportPdfBySession";
import { buildScreeningConclusionContext } from "@/lib/ai/buildScreeningConclusionContext";
import { generateScreeningConclusion } from "@/lib/ai/kotConclusion";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { countKotRawScore, getKotIpLevelLabel, getKotIpNormNote } from "@/lib/kot/kotScore";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import type { Step1Data, Step2Data, Step3Data, Step4Data } from "@/store/useFormStore";

export type RegenerateScreeningSubmissionOptions = {
  regenerateAi?: boolean;
};

export type RegenerateScreeningSubmissionResult = {
  ok: boolean;
  message: string;
  pdfOk?: boolean;
  aiOk?: boolean;
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
  sessionId: string,
  options: RegenerateScreeningSubmissionOptions = {}
): Promise<RegenerateScreeningSubmissionResult> {
  const regenerateAi = options.regenerateAi !== false;

  const row = await prisma.screeningSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
      kotReport: true,
      candidateFolderKey: true,
      profileName: true,
    },
  });

  if (!row) {
    return { ok: false, message: "Сессия скрининга не найдена" };
  }

  const step1 = row.step1Data as Step1Data;
  const rawScore = countKotRawScore(step1);
  const oldKot = _parseKotReport(row.kotReport);

  let conclusionText = oldKot?.conclusionText ?? null;
  let hiringRecommendations = oldKot?.hiringRecommendations ?? null;
  let conclusionGeneratedAt = oldKot?.conclusionGeneratedAt ?? null;
  let aiOk: boolean | undefined;

  if (regenerateAi) {
    const profileName = row.profileName.trim();
    const screeningContext = buildScreeningConclusionContext({
      rawScore,
      maxScore: KOT_STEP_QUESTION_COUNT,
      kotIpLevelLabel: getKotIpLevelLabel(rawScore),
      kotIpNormNote: getKotIpNormNote(),
      profileName,
      step2: row.step2Data as Step2Data,
      step3: row.step3Data as Step3Data,
      step4: row.step4Data as Step4Data,
    });
    const aiResult = await generateScreeningConclusion({
      screeningContext,
      sessionRef: shortSessionRef(row.sessionId),
    });
    if (aiResult.conclusion !== null) {
      conclusionText = aiResult.conclusion;
      hiringRecommendations = aiResult.hiringRecommendations;
      conclusionGeneratedAt = formatMoscowNow();
      aiOk = true;
    } else {
      aiOk = false;
    }
  }

  const kotReport: KotReportJson = {
    version: 4,
    rawScore,
    maxScore: KOT_STEP_QUESTION_COUNT,
    kotIp: rawScore,
    kotIpLevelLabel: getKotIpLevelLabel(rawScore),
    kotIpNormNote: getKotIpNormNote(),
    conclusionText,
    hiringRecommendations,
    conclusionGeneratedAt,
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

  const parts: string[] = ["JSON скрининга обновлён"];
  if (aiOk === true) {
    parts.push("ИИ-заключение КОТ пересобрано");
  } else if (aiOk === false) {
    parts.push("ИИ-заключение не удалось сгенерировать");
  }
  parts.push(pdfOk ? "PDF сформирован" : "PDF не удалось сформировать");

  return {
    ok: true,
    message: parts.join("; "),
    pdfOk,
    aiOk,
  };
}
