import { buildGerchikovNarrativeParagraphs } from "@/lib/audit/report/buildGerchikovNarrativeParagraphs";
import type { AuditReportNarrativeParagraph } from "@/lib/audit/report/auditNarrativeParagraph";
import {
  narrativeBrandSubheading,
  narrativeInlineResult,
  narrativePlain,
} from "@/lib/audit/report/auditNarrativeParagraph";
import { NARRATIVE_SECTION_TITLES } from "@/lib/audit/report/auditNarrativeReference";
import type { GerchikovStep2Data } from "@/lib/gerchikov/step2Types";
import { gerchikovStep2ToAuditAnswers } from "@/lib/gerchikov/step2Types";
import { KOT_IP_NORM_NOTE } from "@/lib/kot/kotOfficial50Scoring";
import {
  SCREENING_KOT_INTRO,
  SCREENING_KOT_RESULTS_HEADING,
  SCREENING_LIKERT_INTRO,
  SCREENING_LIKERT_RESULTS_HEADING,
  SCREENING_SECTION_TITLES,
} from "@/lib/screening/report/screeningNarrativeReference";
import type { ScreeningReportNarrativeSection } from "@/lib/screening/report/screeningReportTypes";
import {
  computeStep3MeanScore,
  describeStep3MeanLevel,
} from "@/lib/step3/step3LikertScore";
import type { Step3Data } from "@/store/useFormStore";

export type ScreeningNarrativeInput = {
  kotIp: number;
  maxScore: number;
  kotIpLevelLabel: string;
  step2: GerchikovStep2Data;
  step3: Step3Data;
};

/**
 * Собирает три нарративные секции скрининга (КОТ, мотивация, эмоциональный фон).
 */
export function buildScreeningNarrativeSections(
  input: ScreeningNarrativeInput
): ReadonlyArray<ScreeningReportNarrativeSection> {
  return [
    _buildKotSection(input),
    _buildMotivationSection(input),
    _buildLikertSection(input),
  ];
}

function _section(
  sectionIndex: number,
  title: string,
  paragraphs: ReadonlyArray<AuditReportNarrativeParagraph>
): ScreeningReportNarrativeSection {
  return {
    sectionIndex,
    title,
    paragraphs: paragraphs.filter((p) => {
      if (p.text !== undefined && p.text.trim().length > 0) {
        return true;
      }
      if (p.highlight !== undefined && p.highlight.trim().length > 0) {
        return true;
      }
      if (p.prefix !== undefined && p.prefix.trim().length > 0) {
        return true;
      }
      return false;
    }),
  };
}

function _buildKotSection(input: ScreeningNarrativeInput): ScreeningReportNarrativeSection {
  const ipLine = `Ип = ${String(input.kotIp)} из ${String(input.maxScore)}`;
  const levelLine = input.kotIpLevelLabel.trim().length > 0 ? input.kotIpLevelLabel : "не определён";
  const paragraphs: AuditReportNarrativeParagraph[] = [
    narrativePlain(SCREENING_KOT_INTRO),
    narrativePlain(KOT_IP_NORM_NOTE),
    narrativeBrandSubheading(SCREENING_KOT_RESULTS_HEADING),
    narrativeInlineResult(
      "По результатам тестирования интегральный показатель ",
      ipLine,
      `, уровень развития — ${levelLine}.`
    ),
  ];
  return _section(2, SCREENING_SECTION_TITLES.kot, paragraphs);
}

function _buildMotivationSection(input: ScreeningNarrativeInput): ScreeningReportNarrativeSection {
  return _section(
    3,
    NARRATIVE_SECTION_TITLES.motivation,
    buildGerchikovNarrativeParagraphs(gerchikovStep2ToAuditAnswers(input.step2))
  );
}

function _buildLikertSection(input: ScreeningNarrativeInput): ScreeningReportNarrativeSection {
  const mean = computeStep3MeanScore(input.step3);
  const paragraphs: AuditReportNarrativeParagraph[] = [
    narrativePlain(SCREENING_LIKERT_INTRO),
    narrativeBrandSubheading(SCREENING_LIKERT_RESULTS_HEADING),
  ];

  if (mean > 0) {
    paragraphs.push(
      narrativeInlineResult(
        "По результатам тестирования средний балл ",
        String(mean),
        ` из 5. ${describeStep3MeanLevel(mean)}`
      )
    );
  } else {
    paragraphs.push(
      narrativePlain("По результатам тестирования средний балл определить не удалось (нет ответов).")
    );
  }

  return _section(4, SCREENING_SECTION_TITLES.emotional, paragraphs);
}
