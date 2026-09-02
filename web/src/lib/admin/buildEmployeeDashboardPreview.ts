import type { EmployeeFolderDetail } from "@/lib/admin/employeeFolderTypes";
import {
  AUDIT_REPORT_VERSION,
  type AuditReportJson,
} from "@/lib/audit/report/auditReportTypes";

export type EmployeeDashboardPreview = EmployeeFolderDetail["dashboardPreview"];

const EMPTY_PREVIEW: EmployeeDashboardPreview = {
  criticalIndicators: ["Нет данных отчёта"],
  yearOverYearNote: "Нет прохождений для сравнения.",
  profileSummary: "Профиль пока не сформирован.",
  applicableMotivation: "Нет данных скрининга.",
};

/**
 * Собирает превью дашборда из сохранённого JSON отчёта аудита/скрининга.
 */
export function buildEmployeeDashboardPreview(report: AuditReportJson | null): EmployeeDashboardPreview {
  if (report === null) {
    return EMPTY_PREVIEW;
  }

  const criticalIndicators = _collectCriticalIndicators(report);
  const yearOverYearNote = _resolveYearOverYearNote(report);
  const profileSummary = _resolveProfileSummary(report);
  const applicableMotivation = _resolveApplicableMotivation(report);

  return {
    criticalIndicators,
    yearOverYearNote,
    profileSummary,
    applicableMotivation,
  };
}

/** Парсит сохранённый `audit_report` из БД. */
export function parseStoredAuditReportJson(value: unknown): AuditReportJson | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const rec = value as { version?: unknown };
  if (rec.version !== AUDIT_REPORT_VERSION) {
    return null;
  }
  return value as AuditReportJson;
}

function _collectCriticalIndicators(report: AuditReportJson): ReadonlyArray<string> {
  const lines: string[] = [];

  if (report.burnoutPiAlert?.critical === true) {
    const score =
      report.burnoutPiAlert.score !== null ? String(report.burnoutPiAlert.score) : "—";
    lines.push(`Критическое психоэмоциональное истощение (ПИ = ${score})`);
  }

  for (const line of report.managerBrief.testLines) {
    if (line.alertHeadline) {
      lines.push(line.alertHeadline);
      continue;
    }
    if (line.danger) {
      const text = line.briefAnswer.trim().length > 0 ? line.briefAnswer : line.title;
      lines.push(`${line.title}: ${text}`);
    }
  }

  if (lines.length === 0) {
    return ["Критические показатели не выявлены"];
  }
  return lines;
}

function _resolveYearOverYearNote(report: AuditReportJson): string {
  const aiNote = report.ai.yearOverYearDynamics?.trim();
  if (aiNote) {
    return aiNote;
  }

  const deltas = report.yoy?.deltas ?? [];
  if (deltas.length > 0) {
    return deltas
      .map((item) => {
        if (item.delta === null) {
          return `${item.label}: ${String(item.after)}`;
        }
        const sign = item.delta > 0 ? "+" : "";
        return `${item.label}: ${String(item.before ?? "—")} → ${String(item.after)} (${sign}${String(item.delta)})`;
      })
      .join("; ");
  }

  if (report.yoy?.previousSessionId) {
    return "Предыдущее прохождение найдено; динамика в отчёте не сформирована.";
  }

  return "Динамика год к году появится при повторных прохождениях.";
}

function _resolveProfileSummary(report: AuditReportJson): string {
  const manager = report.managerBrief.aiConclusion?.trim();
  if (manager) {
    return manager;
  }
  const ai = report.ai.conclusion?.trim();
  if (ai) {
    return ai.length > 600 ? `${ai.slice(0, 597)}…` : ai;
  }
  const intelligence = report.conclusion.intelligence.statement.trim();
  if (intelligence) {
    return intelligence;
  }
  return "Краткое описание профиля пока не сформировано.";
}

function _resolveApplicableMotivation(report: AuditReportJson): string {
  const types = report.conclusion.motivationTypes;
  if (types.length === 0) {
    return "Мотивационный профиль не определён по результатам тестирования.";
  }
  return types
    .map((item) => {
      const stimulation =
        item.stimulation.applicable.length > 0
          ? ` Применимая стимуляция: ${item.stimulation.applicable.join(", ")}.`
          : "";
      return `${item.typeLabel} — ${item.description}${stimulation}`;
    })
    .join(" ");
}
