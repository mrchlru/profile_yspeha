import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import type { GerchikovStep2Data } from "@/lib/gerchikov/step2Types";
import { generateScreeningPdfBuffer } from "@/lib/report/generateScreeningPdf";
import type { Step1Data, Step3Data, Step4Data } from "@/store/useFormStore";
import { prisma } from "@/lib/prisma";

function _parseKotReport(value: unknown): KotReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<KotReportJson>;
  if (
    typeof row.rawScore !== "number" ||
    typeof row.maxScore !== "number" ||
    typeof row.kotIpLevelLabel !== "string" ||
    typeof row.kotIpNormNote !== "string"
  ) {
    return null;
  }
  return row as KotReportJson;
}

/**
 * Генерирует PDF отчёта скрининга из сохранённой сессии.
 */
export async function generateScreeningReportPdfBySession(
  sessionId: string
): Promise<Buffer | null> {
  const row = await prisma.screeningSubmission.findUnique({
    where: { sessionId },
    select: {
      profileName: true,
      sessionId: true,
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
      kotReport: true,
    },
  });

  if (!row) {
    return null;
  }

  const kotReport = _parseKotReport(row.kotReport);
  if (!kotReport) {
    return null;
  }

  return generateScreeningPdfBuffer({
    profileName: row.profileName,
    sessionId: row.sessionId,
    rawScore: kotReport.rawScore,
    maxScore: kotReport.maxScore,
    kotIp: kotReport.kotIp,
    kotIpLevelLabel: kotReport.kotIpLevelLabel,
    kotIpNormNote: kotReport.kotIpNormNote,
    step1: row.step1Data as Step1Data,
    step2: row.step2Data as GerchikovStep2Data,
    step3: row.step3Data as Step3Data,
    step4: row.step4Data as Step4Data,
    conclusionText: kotReport.conclusionText,
    hiringRecommendations: kotReport.hiringRecommendations,
  });
}
