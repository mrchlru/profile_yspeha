import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import {
  narrativeParagraphPlainText,
  normalizeNarrativeParagraph,
} from "@/lib/audit/report/auditNarrativeParagraph";
import { resolveManagerBriefLineTitle } from "@/lib/audit/report/odReserveManagerBriefLineTitles";
import { resolveOdReserveManagerBriefText } from "@/lib/audit/report/resolveOdReserveManagerBriefText";
import type { ManagerBriefLineOverrides } from "@/lib/audit/report/resolveOdReservePsychologicalState";
import { NARRATIVE_SECTION_TITLES } from "@/lib/audit/report/auditNarrativeReference";
import type {
  AuditReportManagerBrief,
  AuditReportManagerLine,
  AuditReportNarrativeSection,
  AuditReportTestBlock,
} from "@/lib/audit/report/auditReportTypes";
import { isBurnoutPiBandCritical } from "@/lib/burnout/burnoutPiCritical";
import {
  buildMaslachManagerBriefContent,
  MASLACH_MANAGER_BRIEF_LINE_TITLE,
  MASLACH_MANAGER_SECTION_TITLE,
} from "@/lib/burnout/buildMaslachManagerBriefContent";
import type { BurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { computeSectarianismEvaluation } from "@/lib/audit/report/computeSectarianismScores";
import { computeMaslachMbiFromAuditStep } from "@/lib/audit/report/computeMaslachMbiFromAuditStep";
import type { AuditReportManagerMaslachBrief } from "@/lib/audit/report/auditReportTypes";

const SECTARIANISM_MANAGER_ALERT_HEADLINE = "ВЫЯВЛЕНЫ ПРИЗНАКИ НАХОЖДЕНИЯ В СЕКТЕ";
const SECTARIANISM_MANAGER_ALERT_FOOTNOTE =
  "за подробностями обратитесь к HR-директору";

const BRIEF_ANSWER_MAX_CHARS = 140;

const VERDICT_RESULT_MARKERS = [
  "Предпочтительный стиль:",
  "Профили:",
  "Профиль:",
  "Диапазон:",
  "Преобладает:",
  "Доминирующий стиль:",
  "Ведущий стиль:",
  "Тип:",
  "Темперамент:",
  "Яркость Σ",
  "IQ (взрослые",
  "IQ:",
  "Общий сырой балл:",
  "Уровень лояльности:",
  "K комм.:",
  "K орг.:",
  "Оценка:",
  "ПИ (истощение):",
  "ИПВ (индекс):",
  "ИЗР (индекс загрузки):",
] as const;

/**
 * Собирает краткий блок «для руководителя»: по одной строке на методику + ИИ-вывод.
 */
export function buildAuditManagerBrief(
  testBlocks: ReadonlyArray<AuditReportTestBlock>,
  narrativeSections: ReadonlyArray<AuditReportNarrativeSection>,
  aiConclusion: string | null,
  burnoutScores?: BurnoutScores | null,
  answers?: AuditAnswersMap,
  reportProfile?: AuditReportProfile,
  lineOverrides?: ManagerBriefLineOverrides
): AuditReportManagerBrief {
  const piCritical = isBurnoutPiBandCritical(burnoutScores?.piBand ?? null);
  const sectarianEvaluation = _evaluateSectarianismForManager(answers);
  const lines =
    narrativeSections.length > 0
      ? narrativeSections.map((section) => {
          const maslachLine = _mapMaslachManagerLine(section, answers);
          if (maslachLine !== null) {
            return maslachLine;
          }
          const sectLine = _mapSectarianManagerLine(section, sectarianEvaluation);
          if (sectLine !== null) {
            return sectLine;
          }
          const title = resolveManagerBriefLineTitle(
            section.sectionIndex,
            section.title,
            reportProfile
          );
          const docBrief =
            reportProfile === "od_reserve" || reportProfile === "tu_management_chef"
              ? (lineOverrides?.[section.sectionIndex] ??
                resolveOdReserveManagerBriefText(section.sectionIndex, answers))
              : null;
          return {
            blockIndex: section.sectionIndex,
            title,
            briefAnswer: docBrief ?? extractBriefNarrativeAnswer(section),
            danger:
              piCritical &&
              (section.sectionIndex === 5 ||
                section.title === NARRATIVE_SECTION_TITLES.burnout)
                ? true
                : undefined,
          };
        })
      : testBlocks.map((block) => ({
          blockIndex: block.blockIndex,
          title: block.title,
          briefAnswer: extractBriefTestAnswer(block),
        }));
  return {
    testLines: lines,
    aiConclusion: aiConclusion !== null ? aiConclusion.trim() || null : null,
  };
}

function _evaluateSectarianismForManager(
  answers: AuditAnswersMap | undefined
): ReturnType<typeof computeSectarianismEvaluation> | null {
  if (answers === undefined) {
    return null;
  }
  const sectarianStep = AUDIT_STEPS.find((s) => s.internalKey === "sectarianism_screening");
  if (sectarianStep === undefined) {
    return null;
  }
  return computeSectarianismEvaluation(answers[sectarianStep.stepIndex]);
}

function _mapMaslachManagerLine(
  section: AuditReportNarrativeSection,
  answers: AuditAnswersMap | undefined
): AuditReportManagerLine | null {
  if (section.title !== MASLACH_MANAGER_SECTION_TITLE || answers === undefined) {
    return null;
  }
  const maslachStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_mbi_short");
  const { interpretation } = computeMaslachMbiFromAuditStep(
    maslachStep ? answers[maslachStep.stepIndex] : undefined
  );
  if (interpretation === null) {
    return {
      blockIndex: section.sectionIndex,
      title: MASLACH_MANAGER_BRIEF_LINE_TITLE,
      briefAnswer: "Недостаточно ответов для интерпретации опросника на выгорание.",
    };
  }

  const content = buildMaslachManagerBriefContent(interpretation);
  const maslachBrief: AuditReportManagerMaslachBrief = {
    overallTitle: content.overallTitle,
    overallText: content.overallText,
    overallTrafficLight: content.overallTrafficLight,
    scales: content.scales.map((scale) => ({
      scaleTitle: scale.scaleTitle,
      whatItMeasures: scale.whatItMeasures,
      statusLabel: scale.statusLabel,
      managerMeaning: scale.managerMeaning,
      trafficLight: scale.trafficLight,
    })),
  };

  return {
    blockIndex: section.sectionIndex,
    title: MASLACH_MANAGER_BRIEF_LINE_TITLE,
    briefAnswer: content.overallText,
    maslachBrief,
    danger:
      content.overallTrafficLight === "red" || content.overallTrafficLight === "orange",
  };
}

function _mapSectarianManagerLine(
  section: AuditReportNarrativeSection,
  evaluation: ReturnType<typeof computeSectarianismEvaluation> | null
): AuditReportManagerLine | null {
  if (section.title !== "Тест на выявление сектантства" || evaluation === null) {
    return null;
  }
  if (evaluation.anyDetected) {
    return {
      blockIndex: section.sectionIndex,
      title: section.title,
      briefAnswer: "",
      danger: true,
      alertHeadline: SECTARIANISM_MANAGER_ALERT_HEADLINE,
      alertFootnote: SECTARIANISM_MANAGER_ALERT_FOOTNOTE,
    };
  }
  return {
    blockIndex: section.sectionIndex,
    title: section.title,
    briefAnswer: evaluation.managerBriefWhenClear,
  };
}

/** Краткий вывод из нарративной секции (последний содержательный абзац). */
export function extractBriefNarrativeAnswer(section: AuditReportNarrativeSection): string {
  const meaningful = section.paragraphs
    .map((p) => narrativeParagraphPlainText(p).trim())
    .filter(
      (p) =>
        p.length > 0 &&
        !p.startsWith("При проведении") &&
        !p.startsWith("Тестирование") &&
        !p.startsWith("Тест ") &&
        !p.startsWith("Опросник") &&
        !p.startsWith("Данная методика") &&
        !p.startsWith("Методика") &&
        !p.startsWith("Соперничество:") &&
        !p.startsWith("Приспособление:") &&
        !p.startsWith("Компромисс:") &&
        !p.startsWith("Избегание:") &&
        !p.startsWith("Сотрудничество:") &&
        !p.startsWith("Ключевые характеристики")
    );
  const highlightedTexts = section.paragraphs
    .map((p) => normalizeNarrativeParagraph(p))
    .filter((p) => p.highlight !== undefined && p.highlight.trim().length > 0)
    .map((p) => narrativeParagraphPlainText(p).trim());
  if (highlightedTexts.length > 0) {
    const joined = highlightedTexts.join("; ");
    const maxChars =
      highlightedTexts.length > 1 ? BRIEF_ANSWER_MAX_CHARS * 2 : BRIEF_ANSWER_MAX_CHARS;
    return truncateBriefAnswer(joined, maxChars);
  }
  const last = meaningful[meaningful.length - 1];
  if (last !== undefined) {
    return truncateBriefAnswer(last);
  }
  return "Недостаточно данных для краткого вывода.";
}

/** Краткий управленческий вердикт по одной методике. */
export function extractBriefTestAnswer(block: AuditReportTestBlock): string {
  for (let i = block.results.length - 1; i >= 0; i -= 1) {
    const line = block.results[i] ?? "";
    if (_isVerdictResultLine(line)) {
      return truncateBriefAnswer(line);
    }
  }

  const conclusion = block.conclusionParagraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(" ");
  if (conclusion.length > 0) {
    return truncateBriefAnswer(conclusion);
  }

  const fallback = block.results[block.results.length - 1];
  if (fallback && fallback.trim().length > 0) {
    return truncateBriefAnswer(fallback);
  }

  return "Недостаточно данных для краткого вывода.";
}

function _isVerdictResultLine(line: string): boolean {
  return VERDICT_RESULT_MARKERS.some((marker) => line.includes(marker));
}

function truncateBriefAnswer(
  text: string,
  maxChars: number = BRIEF_ANSWER_MAX_CHARS
): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  const cut = normalized.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 60 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

export type { AuditReportManagerLine };
