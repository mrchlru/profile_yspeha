import type { AuditHrStructuredReport } from "@/lib/ai/audit/auditAiTypes";
import type {
  AuditConclusionData,
  AuditConclusionMotivationType,
} from "@/lib/audit/report/auditReportTypes";
import { AI_REPORT_DISCLAIMER } from "@/lib/report/reportAiSectionLayout";

/**
 * Рендерит итоговое заключение в plain text (для email и текстового fallback):
 * детерминированные данные (IQ-банд, таблицы мотивации) + связный нарратив ИИ.
 */
export function renderAuditHrReport(
  report: AuditHrStructuredReport,
  conclusion: AuditConclusionData | null
): string {
  const parts: string[] = [];

  parts.push(_intelligenceSection(report, conclusion));
  parts.push(_motivationSection(report, conclusion));
  parts.push(_section("РЕАЛИЗАЦИЯ ПСИХОТИПА", report.psychotypeRealization));
  parts.push(_methodologySection(report.methodologyInsights));
  parts.push(_section("РИСКИ И ДОПОЛНИТЕЛЬНЫЕ ХАРАКТЕРИСТИКИ", report.risksAndAdditional));
  parts.push(AI_REPORT_DISCLAIMER);

  return parts.filter((p) => p.trim().length > 0).join("\n\n");
}

function _intelligenceSection(
  report: AuditHrStructuredReport,
  conclusion: AuditConclusionData | null
): string {
  const lines: string[] = ["УРОВЕНЬ ИНТЕЛЛЕКТА"];
  if (conclusion !== null) {
    lines.push(conclusion.intelligence.statement);
  }
  if (report.intelligenceVerdict.trim().length > 0) {
    lines.push(report.intelligenceVerdict.trim());
  }
  return lines.join("\n");
}

function _motivationSection(
  report: AuditHrStructuredReport,
  conclusion: AuditConclusionData | null
): string {
  const lines: string[] = ["МОТИВАЦИОННЫЙ ТИП"];
  if (report.motivationCommentary.trim().length > 0) {
    lines.push(report.motivationCommentary.trim());
  }
  if (conclusion !== null) {
    for (const type of conclusion.motivationTypes) {
      lines.push("");
      lines.push(..._motivationTypeLines(type));
    }
  }
  return lines.join("\n");
}

function _motivationTypeLines(type: AuditConclusionMotivationType): string[] {
  const lines = [
    `Тип ${String(type.order)}. ${type.typeLabel} мотивационный тип`,
    `Описание: ${type.description}`,
    `Базовые меры стимулирования: ${_joinOrDash(type.stimulation.base)}`,
    `Возможные меры стимулирования: ${_joinOrDash(type.stimulation.applicable)}`,
    `Не рекомендуется: ${_joinOrDash(type.stimulation.forbidden)}`,
    "Ожидаемое трудовое поведение:",
    `• Трудовая дисциплина: ${type.workBehavior.discipline}`,
    `• Инициативность: ${type.workBehavior.initiative}`,
    `• Функциональность: ${type.workBehavior.functionality}`,
    `• Отношение к обучению: ${type.workBehavior.learning}`,
  ];
  return lines;
}

function _methodologySection(insights: ReadonlyArray<string>): string {
  const cleaned = insights.map((s) => s.trim()).filter((s) => s.length > 0);
  if (cleaned.length === 0) {
    return "";
  }
  const lines = ["ВЫВОДЫ ПО МЕТОДИКАМ"];
  cleaned.forEach((insight, i) => {
    lines.push(`${String(i + 1)}. ${insight}`);
  });
  return lines.join("\n");
}

function _section(title: string, body: string): string {
  if (body.trim().length === 0) {
    return "";
  }
  return `${title}\n${body.trim()}`;
}

function _joinOrDash(items: ReadonlyArray<string>): string {
  return items.length > 0 ? items.join("; ") : "—";
}
