import type { AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { NARRATIVE_MOTIVATION_INTRO } from "@/lib/audit/report/auditNarrativeReference";
import type { AuditReportNarrativeParagraph } from "@/lib/audit/report/auditNarrativeParagraph";
import {
  narrativeInlineResult,
  narrativePlain,
} from "@/lib/audit/report/auditNarrativeParagraph";
import {
  computeGerchikovProfile,
  gerchikovDominantTypes,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import {
  GERCHIKOV_CONCLUSION_DESCRIPTIONS,
  GERCHIKOV_CONCLUSION_TYPE_LABELS,
} from "@/lib/audit/report/keys/auditScoringKeys";

/**
 * Нарратив мотивации Герчикова — единый для аудита состояния и скрининга.
 */
export function buildGerchikovNarrativeParagraphs(
  answers: AuditStepAnswers | undefined
): ReadonlyArray<AuditReportNarrativeParagraph> {
  const profile = computeGerchikovProfile(answers);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_MOTIVATION_INTRO)];
  if (profile.answerSlots === 0) {
    paragraphs.push(
      narrativePlain("По результатам тестирования мотивационный тип определить не удалось.")
    );
    return paragraphs;
  }
  const dominant = gerchikovDominantTypes(profile);
  const typeLine = dominant.map((type) => GERCHIKOV_CONCLUSION_TYPE_LABELS[type]).join(" / ");
  paragraphs.push(
    narrativeInlineResult("По результатам тестирования мотивационный тип: ", typeLine, ".")
  );
  for (const type of dominant) {
    paragraphs.push(narrativePlain(GERCHIKOV_CONCLUSION_DESCRIPTIONS[type]));
  }
  return paragraphs;
}
