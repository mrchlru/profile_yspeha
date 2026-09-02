import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { generateOdReserveManagerBriefConclusionAi } from "@/lib/ai/generateOdReserveManagerBriefConclusionAi";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import { buildOdReserveManagerBriefConclusion } from "@/lib/audit/report/buildOdReserveManagerBriefConclusion";
import { sanitizeManagerBriefConclusionText } from "@/lib/audit/report/sanitizeManagerBriefConclusionText";
import type { ManagerBriefLineOverrides } from "@/lib/audit/report/resolveOdReservePsychologicalState";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

/**
 * Заключение для блока «Отчёт для руководителя»: ИИ по данным человека, при сбое — запасной текст.
 */
export async function resolveOdReserveManagerBriefConclusionHybrid(input: {
  answers: AuditAnswersMap;
  sessionRef: string;
  useAi: boolean;
  lineOverrides?: ManagerBriefLineOverrides;
}): Promise<string> {
  if (input.useAi) {
    const fromAi = await generateOdReserveManagerBriefConclusionAi({
      answers: input.answers,
      sessionRef: input.sessionRef,
      lineOverrides: input.lineOverrides,
    });
    if (fromAi !== null && fromAi.length >= 80) {
      return fromAi;
    }
    screeningServerLog("openai_manager_brief", "fallback_to_rules", {
      sessionRef: input.sessionRef,
      hadAi: fromAi !== null,
    });
  }
  return sanitizeManagerBriefConclusionText(
    buildOdReserveManagerBriefConclusion(input.answers)
  );
}

/**
 * Синхронный резолвер для сборки JSON (пересборка без OpenAI).
 */
export function resolveManagerBriefConclusion(
  answers: AuditAnswersMap,
  reportProfile: AuditReportProfile,
  aiConclusionFromHrBlock: string | null
): string | null {
  if (reportProfile === "od_reserve" || reportProfile === "tu_management_chef") {
    return sanitizeManagerBriefConclusionText(buildOdReserveManagerBriefConclusion(answers));
  }
  return aiConclusionFromHrBlock;
}
