import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { buildAuditManagerBrief } from "@/lib/audit/report/buildAuditManagerBrief";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import type {
  AuditReportManagerBrief,
  AuditReportNarrativeSection,
  AuditReportTestBlock,
} from "@/lib/audit/report/auditReportTypes";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import { OD_RESERVE_MANAGER_BRIEF_LINE_TITLES } from "@/lib/audit/report/odReserveManagerBriefLineTitles";
import {
  resolveOdReserveManagerBriefConclusionHybrid,
  resolveManagerBriefConclusion,
} from "@/lib/audit/report/resolveManagerBriefConclusion";
import {
  buildPsychologicalStateLineOverride,
  OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX,
  resolveOdReservePsychologicalStateHybrid,
  type ManagerBriefLineOverrides,
} from "@/lib/audit/report/resolveOdReservePsychologicalState";
import { managerBriefPsychologicalStateText } from "@/lib/audit/report/odReserveManagerBriefInterpretations";
import { buildPsychologicalStateSignals } from "@/lib/audit/report/buildPsychologicalStateSignals";

export type RebuildManagerBriefWithPsychAiInput = {
  answers: AuditAnswersMap;
  testBlocks: ReadonlyArray<AuditReportTestBlock>;
  narrativeSections: ReadonlyArray<AuditReportNarrativeSection>;
  reportProfile: AuditReportProfile;
  sessionRef: string;
  useAi: boolean;
  existingAiConclusion?: string | null;
  storedManagerBrief?: AuditReportManagerBrief | null;
};

export type RebuildManagerBriefWithPsychAiResult = {
  managerBrief: AuditReportManagerBrief;
  lineOverrides: ManagerBriefLineOverrides | undefined;
};

/**
 * Собирает managerBrief с ИИ-синтезом пункта «Психологическое состояние» (ОД / ТУ).
 */
export async function rebuildManagerBriefWithPsychAi(
  input: RebuildManagerBriefWithPsychAiInput
): Promise<RebuildManagerBriefWithPsychAiResult> {
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnoutScores = computeBurnoutScores(
    burnoutStep ? input.answers[burnoutStep.stepIndex] : undefined
  );

  if (
    !reportUsesOdPsychologicalStateBrief(
      input.reportProfile,
      input.narrativeSections,
      input.storedManagerBrief
    )
  ) {
    const managerBrief = buildAuditManagerBrief(
      input.testBlocks,
      input.narrativeSections,
      resolveManagerBriefConclusion(
        input.answers,
        input.reportProfile,
        input.existingAiConclusion ?? null
      ),
      burnoutScores,
      input.answers,
      input.reportProfile
    );
    return { managerBrief, lineOverrides: undefined };
  }

  const psychStateText = await resolveOdReservePsychologicalStateHybrid({
    answers: input.answers,
    sessionRef: input.sessionRef,
    useAi: input.useAi,
  });
  const lineOverrides = buildPsychologicalStateLineOverride(psychStateText);

  const managerConclusion = await resolveOdReserveManagerBriefConclusionHybrid({
    answers: input.answers,
    sessionRef: input.sessionRef,
    useAi: input.useAi,
    lineOverrides,
  });

  const managerBrief = buildAuditManagerBrief(
    input.testBlocks,
    input.narrativeSections,
    managerConclusion,
    burnoutScores,
    input.answers,
    input.reportProfile,
    lineOverrides
  );

  return { managerBrief, lineOverrides };
}

/** Нужен ли синтез психологического состояния для этого отчёта. */
export function reportUsesOdPsychologicalStateBrief(
  reportProfile: AuditReportProfile,
  narrativeSections: ReadonlyArray<AuditReportNarrativeSection>,
  storedManagerBrief?: AuditReportManagerBrief | null
): boolean {
  if (reportProfile === "od_reserve" || reportProfile === "tu_management_chef") {
    return true;
  }
  const psychTitle =
    OD_RESERVE_MANAGER_BRIEF_LINE_TITLES[OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX - 1];
  const storedHasPsychLine = (storedManagerBrief?.testLines ?? []).some(
    (line) =>
      line.title.trim() === psychTitle ||
      line.title.includes("Психологическое состояние") ||
      line.blockIndex === OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX
  );
  if (storedHasPsychLine) {
    return true;
  }
  return narrativeSections.some(
    (section) =>
      section.sectionIndex === OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX ||
      section.title.trim() === psychTitle ||
      section.title.includes("Психологическое состояние")
  );
}

/** Есть ли ответы по методике Рукавишникова (Тест 12). */
export function hasRukavishnikovBurnoutAnswers(answers: AuditAnswersMap): boolean {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  if (step === undefined) {
    return false;
  }
  const scores = computeBurnoutScores(answers[step.stepIndex]);
  return scores.answeredCount > 0;
}

/** Текст пункта 5 выглядит как старая склейка referencePhrase (нужна пересборка). */
export function isLegacyConcatenatedPsychBriefText(text: string | undefined | null): boolean {
  if (text === undefined || text === null || text.trim().length === 0) {
    return false;
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  const phrases = [
    "Отличное эмоциональное состояние",
    "Человек социопат",
    "Максимально доволен своей работой",
    "Низкая эмоциональная толерантность",
    "У сотрудника низкий уровень рабочей загрузки",
  ];
  const hits = phrases.filter((phrase) => normalized.includes(phrase));
  return hits.length >= 3;
}

export function storedManagerBriefNeedsPsychRegeneration(
  stored: {
    managerBrief?: { testLines?: ReadonlyArray<{ title?: string; briefAnswer?: string; blockIndex?: number }> };
  } | null,
  answers: AuditAnswersMap,
  reportProfile: AuditReportProfile
): boolean {
  if (!hasRukavishnikovBurnoutAnswers(answers)) {
    return false;
  }
  if (reportProfile === "od_reserve" || reportProfile === "tu_management_chef") {
    return true;
  }
  const psychLine = stored?.managerBrief?.testLines?.find(
    (line) =>
      line.title?.includes("Психологическое состояние") ||
      line.blockIndex === OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX
  );
  if (psychLine !== undefined) {
    return isLegacyConcatenatedPsychBriefText(psychLine.briefAnswer);
  }
  return false;
}

/** Для диагностики: совпадает ли текст со склейкой всех referencePhrase. */
export function matchesReferencePhraseConcat(text: string, answers: AuditAnswersMap): boolean {
  const signals = buildPsychologicalStateSignals(answers);
  if (signals.indicators.length === 0) {
    return false;
  }
  const concat = managerBriefPsychologicalStateText(
    signals.indicators.map((item) => item.referencePhrase)
  );
  return text.replace(/\s+/g, " ").trim() === concat.replace(/\s+/g, " ").trim();
}
