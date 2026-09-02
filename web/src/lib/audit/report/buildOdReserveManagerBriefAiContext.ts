import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { extractOdReserveAuditSignals } from "@/lib/ai/audit/extractOdReserveAuditSignals";
import { computeMaslachMbiFromAuditStep } from "@/lib/audit/report/computeMaslachMbiFromAuditStep";
import {
  computeThomasKilmannScores,
  roweDominantStyleLabel,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import type { RoweStyleId } from "@/lib/audit/report/keys/auditScoringKeys";
import { buildMaslachManagerBriefContent } from "@/lib/burnout/buildMaslachManagerBriefContent";

import { resolveOdReserveManagerBriefText } from "@/lib/audit/report/resolveOdReserveManagerBriefText";
import { OD_RESERVE_MANAGER_BRIEF_LINE_TITLES } from "@/lib/audit/report/odReserveManagerBriefLineTitles";
import type { ManagerBriefLineOverrides } from "@/lib/audit/report/resolveOdReservePsychologicalState";

const INSUFFICIENT_LINE = "Недостаточно данных для краткого вывода.";

/** Качественный контекст для ИИ — без сырых баллов и названий методик. */
export type OdReserveManagerBriefAiContext = {
  motivation: {
    leadingTypes: ReadonlyArray<string>;
    stimulationHint: string | null;
  };
  communicationAndOrganization: {
    communicationLevel: string | null;
    organizationLevel: string | null;
  };
  conflictBehavior: {
    dominantStyle: string | null;
    avoidsConflict: boolean;
  };
  emotionalState: {
    overall: string | null;
    exhaustionLevel: string | null;
    distancingLevel: string | null;
    engagementLevel: string | null;
    managerActionsFromBurnout: ReadonlyArray<string>;
  };
  limitations: ReadonlyArray<string>;
  professionalLoad: {
    description: string | null;
  };
  adaptability: string | null;
  stressProfile: string | null;
  decisionStyle: ReadonlyArray<string>;
  goalDrive: string | null;
  riskAttitude: string | null;
  /** Тексты пунктов 1–11 отчёта для руководителя (индивидуальная база для ИИ). */
  reportLines: ReadonlyArray<{ title: string; text: string }>;
};

/**
 * Собирает качественные сигналы по батарее ОД/ТУ для генерации заключения руководителю.
 */
export function buildOdReserveManagerBriefAiContext(
  answers: AuditAnswersMap,
  lineOverrides?: ManagerBriefLineOverrides
): OdReserveManagerBriefAiContext {
  const signals = extractOdReserveAuditSignals(answers);
  const limitations: string[] = [];

  if (
    signals.communication.complete &&
    signals.communication.commLevel !== null &&
    signals.communication.commLevel <= 2
  ) {
    limitations.push("нежелание общения с людьми");
  }

  const maslachStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_mbi_short");
  const maslach = computeMaslachMbiFromAuditStep(
    maslachStep ? answers[maslachStep.stepIndex] : undefined
  );
  let managerActionsFromBurnout: string[] = [];
  if (maslach.interpretation !== null) {
    const content = buildMaslachManagerBriefContent(maslach.interpretation);
    managerActionsFromBurnout = content.scales
      .filter((s) => s.trafficLight === "red" || s.trafficLight === "orange")
      .map((s) => s.managerMeaning.trim())
      .filter((t) => t.length > 0);
    if (managerActionsFromBurnout.length === 0 && content.overallTrafficLight !== "green") {
      managerActionsFromBurnout = [content.overallText.trim()].filter((t) => t.length > 0);
    }
    if (maslach.interpretation.dp.unfavorable) {
      limitations.push("дистанцирование", "отчуждение");
    } else if (maslach.interpretation.ee.unfavorable) {
      limitations.push("накопленная усталость", "снижение включённости");
    }
  }

  if (
    signals.adaptability.complete &&
    typeof signals.adaptability.level === "string" &&
    signals.adaptability.level.toLowerCase().includes("низ")
  ) {
    limitations.push("затруднённая адаптация к резким изменениям");
  }

  if (
    signals.stressType.complete &&
    signals.stressType.profile !== null &&
    signals.stressType.profile.toLowerCase().includes("тип а")
  ) {
    limitations.push("низкая стрессоустойчивость при жёстком темпе");
  }

  const thomas = computeThomasKilmannScores(answers[20]);
  const maxCount = Math.max(...Object.values(thomas.counts));
  const avoidsConflict =
    thomas.answered >= thomas.totalPairs &&
    maxCount > 0 &&
    (thomas.dominant === "avoiding" || thomas.counts.avoiding === maxCount);

  const loadDescription = _workerLoadDescription(signals.burnout.workerLoad);
  const reportLines = _buildReportLineSummaries(answers, lineOverrides);

  return {
    motivation: {
      leadingTypes: signals.motivation.leadingTypes,
      stimulationHint: signals.motivation.stimulationSummary,
    },
    communicationAndOrganization: {
      communicationLevel:
        signals.communication.commLevel !== null
          ? _kosLevelLabel(signals.communication.commLevel)
          : null,
      organizationLevel:
        signals.communication.orgLevel !== null ? _kosLevelLabel(signals.communication.orgLevel) : null,
    },
    conflictBehavior: {
      dominantStyle: signals.conflictStyle.complete ? signals.conflictStyle.dominant : null,
      avoidsConflict,
    },
    emotionalState: {
      overall: maslach.interpretation?.verdictTitle ?? null,
      exhaustionLevel: maslach.interpretation?.ee.levelLabel ?? null,
      distancingLevel: maslach.interpretation?.dp.levelLabel ?? null,
      engagementLevel: maslach.interpretation?.pa.levelLabel ?? null,
      managerActionsFromBurnout,
    },
    limitations: _uniqueLower(limitations),
    professionalLoad: { description: loadDescription },
    adaptability: signals.adaptability.complete ? signals.adaptability.level : null,
    stressProfile: signals.stressType.complete ? signals.stressType.profile : null,
    decisionStyle: signals.decisionStyle.complete
      ? signals.decisionStyle.dominantStyles.map((styleId) =>
          roweDominantStyleLabel(styleId as RoweStyleId)
        )
      : [],
    goalDrive: signals.goalPursuit.complete ? signals.goalPursuit.level : null,
    riskAttitude: signals.riskReadiness.complete ? signals.riskReadiness.level : null,
    reportLines,
  };
}

function _buildReportLineSummaries(
  answers: AuditAnswersMap,
  lineOverrides?: ManagerBriefLineOverrides
): ReadonlyArray<{ title: string; text: string }> {
  const lines: { title: string; text: string }[] = [];
  for (let sectionIndex = 1; sectionIndex <= 11; sectionIndex += 1) {
    const override = lineOverrides?.[sectionIndex];
    const text =
      override ??
      resolveOdReserveManagerBriefText(sectionIndex, answers);
    if (text === null || text.trim() === INSUFFICIENT_LINE) {
      continue;
    }
    const title = OD_RESERVE_MANAGER_BRIEF_LINE_TITLES[sectionIndex - 1] ?? `Пункт ${String(sectionIndex)}`;
    lines.push({ title, text: text.trim() });
  }

  const maslachStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_mbi_short");
  const maslach = computeMaslachMbiFromAuditStep(
    maslachStep ? answers[maslachStep.stepIndex] : undefined
  );
  if (maslach.interpretation !== null) {
    const content = buildMaslachManagerBriefContent(maslach.interpretation);
    for (const scale of content.scales) {
      lines.push({
        title: `Выгорание: ${scale.scaleTitle}`,
        text: `${scale.statusLabel}. ${scale.managerMeaning}`,
      });
    }
  }

  return lines;
}

function _kosLevelLabel(level: number): string {
  if (level >= 4) {
    return "выраженный";
  }
  if (level >= 3) {
    return "средний";
  }
  if (level >= 2) {
    return "умеренный";
  }
  return "сниженный";
}

function _workerLoadDescription(workerLoad: number | null): string | null {
  if (workerLoad === null) {
    return null;
  }
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

function _uniqueLower(items: ReadonlyArray<string>): string[] {
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
