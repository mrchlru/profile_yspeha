import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import {
  computeGerchikovProfile,
  gerchikovDominantTypes,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import { computeCfitTotals } from "@/lib/audit/report/computeCfitTotals";
import {
  CFIT_ADULT_IQ_MIN_RAW,
  CFIT_ITEM_COUNT_TOTAL,
} from "@/lib/audit/report/keys/auditScoringKeys";
import type {
  AuditConclusionData,
  AuditConclusionMotivationType,
  AuditConclusionStimulation,
} from "@/lib/audit/report/auditReportTypes";
import {
  GERCHIKOV_CONCLUSION_DESCRIPTIONS,
  GERCHIKOV_CONCLUSION_TYPE_LABELS,
  GERCHIKOV_STIMULATION_FORM_LABELS,
  GERCHIKOV_STIMULATION_TABLE,
  GERCHIKOV_TYPE_WORK_BEHAVIOR,
  type GerchikovMotivationType,
  type GerchikovStimulationForm,
} from "@/lib/audit/report/keys/auditScoringKeys";

const CFIT_GOOD_MIN = 85;
const CFIT_GOOD_MAX = 115;

/**
 * Собирает детерминированную часть итогового заключения: банд по IQ и таблицы
 * по ведущим типам мотивации (как в референсном кадровом отчёте).
 */
export function buildAuditConclusionData(answers: AuditAnswersMap): AuditConclusionData {
  const cfit = computeCfitTotals(answers);
  return {
    intelligence: _buildIntelligence(cfit.iq, cfit.correctTotal, cfit.answeredTotal),
    motivationTypes: _buildMotivationTypes(answers),
  };
}

function _buildIntelligence(
  iq: number | null,
  rawScore: number,
  answeredTotal: number
): AuditConclusionData["intelligence"] {
  if (iq === null) {
    const reason =
      answeredTotal < CFIT_ITEM_COUNT_TOTAL
        ? "недостаточно данных по CFIT"
        : rawScore < CFIT_ADULT_IQ_MIN_RAW
          ? `сырой балл ${String(rawScore)} ниже минимума таблицы «общая сумма» (${String(CFIT_ADULT_IQ_MIN_RAW)})`
          : "данные CFIT не позволяют определить IQ";
    return {
      iq: null,
      bandLabel: "не определён",
      statement:
        `Уровень интеллекта по тесту Кэттелла определить не удалось (${reason}). ` +
        "Хорошим уровнем считается показатель 85–115.",
    };
  }
  const bandLabel = _iqBandLabel(iq);
  const statement =
    `Оцениваемый имеет ${bandLabel} уровень интеллекта (значение IQ = ${String(iq)}). ` +
    "Хорошим уровнем по методике Кэттелла считается показатель 85–115.";
  return { iq, bandLabel, statement };
}

function _iqBandLabel(iq: number): string {
  if (iq < CFIT_GOOD_MIN) {
    return "низкий";
  }
  if (iq <= CFIT_GOOD_MAX) {
    return "хороший (средний)";
  }
  return "высокий";
}

function _buildMotivationTypes(
  answers: AuditAnswersMap
): ReadonlyArray<AuditConclusionMotivationType> {
  const profile = computeGerchikovProfile(answers[21]);
  if (profile.answerSlots === 0) {
    return [];
  }
  const dominant = gerchikovDominantTypes(profile);
  return dominant.map((type, index) => ({
    order: index + 1,
    typeLabel: GERCHIKOV_CONCLUSION_TYPE_LABELS[type],
    description: GERCHIKOV_CONCLUSION_DESCRIPTIONS[type],
    stimulation: _buildStimulation(type),
    workBehavior: { ...GERCHIKOV_TYPE_WORK_BEHAVIOR[type] },
  }));
}

function _buildStimulation(type: GerchikovMotivationType): AuditConclusionStimulation {
  const forms = Object.keys(GERCHIKOV_STIMULATION_TABLE) as GerchikovStimulationForm[];
  const base: string[] = [];
  const applicable: string[] = [];
  const forbidden: string[] = [];
  for (const form of forms) {
    const level = GERCHIKOV_STIMULATION_TABLE[form][type];
    const label = GERCHIKOV_STIMULATION_FORM_LABELS[form];
    if (level === "base") {
      base.push(label);
    } else if (level === "applicable") {
      applicable.push(label);
    } else if (level === "forbidden") {
      forbidden.push(label);
    }
  }
  return { base, applicable, forbidden };
}
