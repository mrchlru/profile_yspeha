import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { extractOdReserveAuditSignals } from "@/lib/ai/audit/extractOdReserveAuditSignals";
import { computeMaslachMbiFromAuditStep } from "@/lib/audit/report/computeMaslachMbiFromAuditStep";
import {
  computeGerchikovProfile,
  computeThomasKilmannScores,
  gerchikovDominantTypes,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import type { ThomasKilmannStyle } from "@/lib/audit/report/keys/auditScoringKeys";
import { burnoutBandLabel } from "@/lib/audit/report/computeMbiStep19";
import type { GerchikovMotivationType } from "@/lib/audit/report/keys/auditScoringKeys";
import {
  GERCHIKOV_CONCLUSION_TYPE_LABELS,
} from "@/lib/audit/report/keys/auditScoringKeys";
import { buildMaslachManagerBriefContent } from "@/lib/burnout/buildMaslachManagerBriefContent";
import { motivationPairKey } from "@/lib/audit/report/odReserveManagerBriefInterpretations";
import {
  buildOdReserveManagerBriefConclusionPlan,
  renderOdReserveManagerBriefConclusionPlan,
  type OdReserveManagerBriefConclusionPlan,
} from "@/lib/audit/report/odReserveManagerBriefConclusionPlan";

const GERCHIKOV_VALUE_PHRASES: Readonly<
  Record<GerchikovMotivationType, ReadonlyArray<string>>
> = {
  PA: ["принадлежность к делу", "признание вклада в общий результат"],
  PR: ["полезность результата", "возможность проявить компетентность"],
  IN: ["справедливая оплата труда", "ясная связь усилий и вознаграждения"],
  HO: ["самостоятельность и зона ответственности", "доверие без излишнего контроля"],
  ST: ["предсказуемость условий", "минимизация лишней нагрузки"],
};

/** Краткие формулировки мотивации для финального абзаца (по паре типов). */
const MOTIVATION_CONCLUSION_LEAD: Readonly<Record<string, string>> = {
  "ПА|ПР": "демонстрация преданности на основании прошлых заслуг",
  "ПР|ПА": "демонстрация преданности на основании прошлых заслуг",
  "ПА|ПА":
    "ориентированность на преданность компании, признание заслуг и причастность к общему делу",
  "ПР|ПР": "ориентированность на профессиональную самореализацию и содержание работы",
  "ПА|ИН": "демонстрация лояльности при справедливой оценке прошлых заслуг и оплаты",
  "ИН|ПА": "демонстрация лояльности при справедливой оценке прошлых заслуг и оплаты",
};

const _PLAN_BUILDERS = {
  motivationParagraph: _buildMotivationLeadParagraphFromAnswers,
  limitationPhrases: _collectLimitationPhrases,
  managerActionSentence: _buildMaslachActionSentence,
  conflictSentence: _buildConflictSentence,
  loadSentence: (answers: AuditAnswersMap) => {
    const signals = extractOdReserveAuditSignals(answers);
    return _buildWorkerLoadSentence(signals.burnout.workerLoad);
  },
} as const;

/**
 * Структурированный план заключения (для правил, ИИ и проверки).
 */
export function buildOdReserveManagerBriefConclusionPlanFromAnswers(
  answers: AuditAnswersMap
): OdReserveManagerBriefConclusionPlan {
  return buildOdReserveManagerBriefConclusionPlan(answers, _PLAN_BUILDERS);
}

/**
 * Собирает текст блока «ЗАКЛЮЧЕНИЕ» в «Отчёте для руководителя» для батарей
 * ОД / кадровый резерв и ТУ (12 методик) — без ИИ, по сигналам тестов.
 */
export function buildOdReserveManagerBriefConclusion(answers: AuditAnswersMap): string {
  return renderOdReserveManagerBriefConclusionPlan(
    buildOdReserveManagerBriefConclusionPlanFromAnswers(answers)
  );
}

function _buildMotivationLeadParagraphFromAnswers(answers: AuditAnswersMap): string | null {
  const profile = computeGerchikovProfile(answers[21]);
  const dominant = gerchikovDominantTypes(profile);
  if (dominant.length === 0) {
    return _buildMotivationLeadParagraph([]);
  }
  const first = dominant[0]!;
  const second = dominant[1] ?? first;
  const pairKey = motivationPairKey(first, second);
  const reversedKey = motivationPairKey(second, first);
  const leadCore =
    MOTIVATION_CONCLUSION_LEAD[pairKey] ??
    MOTIVATION_CONCLUSION_LEAD[reversedKey] ??
    _formatMotivationPhrase(dominant).replace(/^У сотрудника преобладает /u, "");

  const values = _uniqueStrings(dominant.flatMap((t) => GERCHIKOV_VALUE_PHRASES[t] ?? []));
  const valuePart =
    values.length > 0 ? `, для него значима ${values.slice(0, 4).join(", ")}` : "";

  const environment = _formatPreferredEnvironmentConclusion(dominant);
  return `У сотрудника преобладает ${leadCore}${valuePart}. ${environment}`;
}

function _formatPreferredEnvironmentConclusion(
  types: ReadonlyArray<GerchikovMotivationType>
): string {
  if (types.includes("PA") || types.includes("PR")) {
    return (
      "Ему больше нравится работать в проектной деятельности, либо с командой, в которой понятные роли " +
      "и присутствует уважение к профессиональному вкладу и прошлым заслугам."
    );
  }
  return _formatPreferredEnvironment(types);
}

function _collectLimitationPhrases(answers: AuditAnswersMap): ReadonlyArray<string> {
  const signals = extractOdReserveAuditSignals(answers);
  const lines = _collectLimitationSentences(signals, answers);
  return lines;
}

function _buildMotivationLeadParagraph(leadingLabels: ReadonlyArray<string>): string | null {
  if (leadingLabels.length === 0) {
    return null;
  }

  const types = _parseGerchikovTypesFromLabels(leadingLabels);
  if (types.length === 0) {
    return null;
  }

  const motivationPhrase = _formatMotivationPhrase(types);
  const values = _uniqueStrings(types.flatMap((t) => GERCHIKOV_VALUE_PHRASES[t] ?? []));
  const valuePart =
    values.length > 0
      ? `: для него значимы ${values.slice(0, 4).join(", ")}`
      : "";

  const environment = _formatPreferredEnvironmentConclusion(types);
  return `${motivationPhrase}${valuePart}. ${environment}`;
}

function _formatMotivationPhrase(types: ReadonlyArray<GerchikovMotivationType>): string {
  const names = types.map((t) => _gerchikovTypeAdjective(t));
  if (names.length === 1) {
    return `У сотрудника преобладает ${names[0]!} мотивация`;
  }
  return `У сотрудника преобладает сочетание ${names.join(" и ")} мотивации`;
}

function _gerchikovTypeAdjective(type: GerchikovMotivationType): string {
  switch (type) {
    case "PA":
      return "патриотическая";
    case "PR":
      return "профессиональная";
    case "IN":
      return "инструментальная";
    case "HO":
      return "хозяйская";
    case "ST":
      return "избегательная";
  }
}

function _parseGerchikovTypesFromLabels(
  labels: ReadonlyArray<string>
): GerchikovMotivationType[] {
  const out: GerchikovMotivationType[] = [];
  for (const label of labels) {
    for (const [type, text] of Object.entries(GERCHIKOV_CONCLUSION_TYPE_LABELS) as [
      GerchikovMotivationType,
      string,
    ][]) {
      if (label.includes(text) || label.includes(type)) {
        if (!out.includes(type)) {
          out.push(type);
        }
      }
    }
  }
  return out;
}

function _formatPreferredEnvironment(
  types: ReadonlyArray<GerchikovMotivationType>
): string {
  const wantsTeam =
    types.includes("PA") || types.includes("PR") || types.includes("HO");
  const wantsAutonomy = types.includes("PR") || types.includes("HO");
  if (!wantsTeam && types.includes("IN")) {
    return (
      "Оптимальнее среда с прозрачными правилами оплаты, измеримыми результатами " +
      "и минимумом неформальных «обязательств»."
    );
  }
  if (!wantsTeam) {
    return "Уточните условия работы по остальным блокам отчёта.";
  }
  const teamPart =
    "Ему больше подходит проектная деятельность или работа в команде с понятными ролями";
  const respectPart = wantsAutonomy
    ? " и уважением к профессиональному вкладу"
    : "";
  return `${teamPart}${respectPart}.`;
}

function _collectLimitationSentences(
  signals: ReturnType<typeof extractOdReserveAuditSignals>,
  answers: AuditAnswersMap
): string[] {
  const fragments: string[] = [];

  if (
    signals.communication.complete &&
    signals.communication.commLevel !== null &&
    signals.communication.commLevel <= 2
  ) {
    fragments.push("нежелание общения с людьми");
  }

  const maslachStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_mbi_short");
  const maslach = computeMaslachMbiFromAuditStep(
    maslachStep ? answers[maslachStep.stepIndex] : undefined
  );
  if (maslach.interpretation !== null) {
    if (maslach.interpretation.dp.unfavorable) {
      fragments.push("дистанцирование", "отчуждение");
    } else if (maslach.interpretation.ee.unfavorable) {
      fragments.push("накопленная усталость и снижение включённости");
    }
  }

  if (
    signals.adaptability.complete &&
    typeof signals.adaptability.level === "string" &&
    signals.adaptability.level.toLowerCase().includes("низ")
  ) {
    fragments.push("затруднённая адаптация к резким изменениям");
  }

  if (
    signals.stressType.complete &&
    signals.stressType.profile !== null &&
    signals.stressType.profile.toLowerCase().includes("тип а")
  ) {
    fragments.push("низкая стрессоустойчивость при жёстком темпе");
  }

  if (fragments.length === 0) {
    return [];
  }

  const unique = _uniqueStrings(fragments);
  const body = unique.join(", ");
  return [`${_capitalizeFirst(body)}.`];
}

function _buildMaslachActionSentence(answers: AuditAnswersMap): string | null {
  const maslachStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_mbi_short");
  const { interpretation } = computeMaslachMbiFromAuditStep(
    maslachStep ? answers[maslachStep.stepIndex] : undefined
  );
  if (interpretation === null) {
    return null;
  }

  const content = buildMaslachManagerBriefContent(interpretation);
  const priority = content.scales
    .filter((s) => s.trafficLight === "red" || s.trafficLight === "orange")
    .sort((a, b) => _trafficRank(b.trafficLight) - _trafficRank(a.trafficLight));

  if (priority.length === 0 && content.overallTrafficLight === "green") {
    return null;
  }

  const hint = _extractActionFromManagerMeaning(priority[0]?.managerMeaning ?? content.overallText);
  if (hint === null) {
    return null;
  }
  return `Для данного сотрудника важны ${hint}.`;
}

function _trafficRank(light: "green" | "yellow" | "orange" | "red"): number {
  if (light === "red") {
    return 3;
  }
  if (light === "orange") {
    return 2;
  }
  if (light === "yellow") {
    return 1;
  }
  return 0;
}

function _extractActionFromManagerMeaning(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const importantMatch = /(?:Важны|Нужны)\s+([^.]+)/i.exec(normalized);
  if (importantMatch?.[1]) {
    return _capitalizeFirst(importantMatch[1].trim());
  }
  const vitalMatch = /(?:важны|нужны)\s+([^.]+)/iu.exec(normalized);
  if (vitalMatch?.[1]) {
    return _capitalizeFirst(vitalMatch[1].trim());
  }
  if (normalized.toLowerCase().includes("обсудить")) {
    return "обсудить условия работы, поддержку и нагрузку до обострения симптомов";
  }
  return null;
}

function _buildConflictSentence(answers: AuditAnswersMap): string | null {
  const thomas = computeThomasKilmannScores(answers[20]);
  if (thomas.answered < thomas.totalPairs) {
    return null;
  }
  const maxCount = Math.max(...Object.values(thomas.counts));
  if (maxCount <= 0) {
    return null;
  }
  const leaders = (Object.keys(thomas.counts) as ThomasKilmannStyle[]).filter(
    (style) => thomas.counts[style] === maxCount
  );
  if (leaders.includes("avoiding") || thomas.dominant === "avoiding") {
    return "Есть склонность избегать конфликтов.";
  }
  return null;
}

function _buildWorkerLoadSentence(workerLoad: number | null): string | null {
  if (workerLoad === null) {
    return null;
  }
  const bandLabel = burnoutBandLabel("worker_load", workerLoad);
  const comfort = _workerLoadComfortClause(workerLoad);
  if (comfort !== null) {
    return `Уровень профессиональной нагрузки — ${comfort}.`;
  }
  return `Уровень профессиональной нагрузки — ${bandLabel}.`;
}

function _workerLoadComfortClause(workerLoad: number): string | null {
  if (workerLoad >= 21 && workerLoad <= 40) {
    return "средний, комфортный для человека";
  }
  if (workerLoad <= 20) {
    return "низкий, с запасом ресурса";
  }
  if (workerLoad <= 60) {
    return "повышенный, требует периодического контроля";
  }
  if (workerLoad <= 80) {
    return "высокий, без запаса";
  }
  return "критический, необходимо снижение нагрузки";
}

function _uniqueStrings(items: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}

function _capitalizeFirst(text: string): string {
  if (text.length === 0) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}
