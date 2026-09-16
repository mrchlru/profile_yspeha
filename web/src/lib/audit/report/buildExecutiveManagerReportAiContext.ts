import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import { narrativeParagraphPlainText } from "@/lib/audit/report/auditNarrativeParagraph";
import { buildOdReserveManagerBriefAiContext } from "@/lib/audit/report/buildOdReserveManagerBriefAiContext";
import type {
  ExecutiveManagerReportProfile,
} from "@/lib/audit/report/executiveManagerReportTypes";
import { EXECUTIVE_HR_ANALYSIS_14_TITLES } from "@/lib/audit/report/executiveManagerReportTypes";
import { extractOdReserveAuditSignals } from "@/lib/ai/audit/extractOdReserveAuditSignals";
import { extractCandidateScreeningAuditSignals } from "@/lib/ai/audit/extractCandidateScreeningAuditSignals";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";

export type ExecutiveManagerReportAiContext = {
  fullName: string;
  reportProfile: ExecutiveManagerReportProfile;
  hrAnalysisTitles: ReadonlyArray<string>;
  signals: Record<string, unknown>;
};

/**
 * Сопоставляет профиль батареи аудита с профилем экспертного отчёта.
 */
export function mapAuditProfileToExecutiveProfile(
  profile: AuditReportProfile | null | undefined
): ExecutiveManagerReportProfile {
  if (profile === "od_reserve") {
    return "od_reserve";
  }
  if (profile === "tu_management_chef") {
    return "tu_management_chef";
  }
  if (profile === "candidate_screening") {
    return "screening";
  }
  return "other";
}

/**
 * Контекст для экспертного отчёта по сессии аудита (ОД / ТУ / скрининг-батарея).
 */
export function buildExecutiveManagerReportAiContextFromAudit(input: {
  fullName: string;
  answers: AuditAnswersMap;
  report: AuditReportJson;
}): ExecutiveManagerReportAiContext {
  const reportProfile = mapAuditProfileToExecutiveProfile(input.report.reportProfile);
  const managerLines = (input.report.managerBrief?.testLines ?? []).map((line) => ({
    title: line.title,
    text: line.briefAnswer,
  }));
  const aiConclusion = input.report.managerBrief?.aiConclusion ?? input.report.ai?.conclusion ?? null;

  if (reportProfile === "od_reserve" || reportProfile === "tu_management_chef") {
    const odSignals = extractOdReserveAuditSignals(input.answers);
    const qualitative = buildOdReserveManagerBriefAiContext(input.answers);
    return {
      fullName: input.fullName,
      reportProfile,
      hrAnalysisTitles: [...EXECUTIVE_HR_ANALYSIS_14_TITLES],
      signals: {
        battery: reportProfile,
        qualitative,
        odSignalsCompact: {
          communication: odSignals.communication,
          motivation: odSignals.motivation,
          conflictStyle: odSignals.conflictStyle,
          burnout: odSignals.burnout,
          maslachMbi: odSignals.maslachMbi,
          stressType: odSignals.stressType,
          adaptability: odSignals.adaptability,
          goalPursuit: odSignals.goalPursuit,
        },
        managerLines,
        existingAiConclusion: aiConclusion,
        narrativeHints: (input.report.narrativeSections ?? []).slice(0, 14).map((section) => ({
          title: section.title,
          preview: section.paragraphs
            .map((p) => narrativeParagraphPlainText(p))
            .join(" ")
            .slice(0, 280),
        })),
      },
    };
  }

  const screeningSignals = extractCandidateScreeningAuditSignals(input.answers);
  return {
    fullName: input.fullName,
    reportProfile: reportProfile === "screening" ? "screening" : "other",
    hrAnalysisTitles: [...EXECUTIVE_HR_ANALYSIS_14_TITLES],
    signals: {
      battery: reportProfile,
      screeningSignals,
      managerLines,
      existingAiConclusion: aiConclusion,
    },
  };
}

/**
 * Контекст для экспертного отчёта по сессии классического скрининга (КОТ + шаги).
 */
export function buildExecutiveManagerReportAiContextFromScreening(input: {
  fullName: string;
  kotReport: KotReportJson;
  step1Data: unknown;
  step2Data: unknown;
  step3Data: unknown;
  step4Data: unknown;
}): ExecutiveManagerReportAiContext {
  return {
    fullName: input.fullName,
    reportProfile: "screening",
    hrAnalysisTitles: [...EXECUTIVE_HR_ANALYSIS_14_TITLES],
    signals: {
      battery: "screening",
      kot: {
        rawScore: input.kotReport.rawScore,
        maxScore: input.kotReport.maxScore,
        kotIp: input.kotReport.kotIp,
        level: input.kotReport.kotIpLevelLabel,
        normNote: input.kotReport.kotIpNormNote,
      },
      conclusionText: input.kotReport.conclusionText,
      hiringRecommendations: input.kotReport.hiringRecommendations,
      step1Keys:
        input.step1Data && typeof input.step1Data === "object"
          ? Object.keys(input.step1Data as object).slice(0, 40)
          : [],
      step2Summary: _summarizeJson(input.step2Data, 1200),
      step3Summary: _summarizeJson(input.step3Data, 800),
      step4Summary: _summarizeJson(input.step4Data, 1200),
    },
  };
}

function _summarizeJson(value: unknown, maxChars: number): string {
  try {
    const text = JSON.stringify(value);
    if (!text) {
      return "";
    }
    return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
  } catch {
    return "";
  }
}
