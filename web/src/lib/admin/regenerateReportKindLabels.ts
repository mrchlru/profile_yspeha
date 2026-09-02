import type { RegenerateStoredReportsError } from "@/lib/admin/regenerateAllStoredReports";

/** Подписи типов тестов для UI пересборки отчётов. */
export const REGENERATE_REPORT_BUCKET_LABELS = {
  managerAssessments:
    "ОД и кадровый резерв; ТУ, шефы и управляющие; скрининг кандидата (объёмный отчёт)",
  screening: "Скрининг кандидата",
  profSbEducation: "ПРОФ СБ + ПРОФ образование",
  burnout: "Тест на выгорание (Маслач)",
} as const;

/** Человекочитаемая подпись для строки ошибки пересборки. */
export function regenerateReportErrorKindLabel(kind: RegenerateStoredReportsError["kind"]): string {
  switch (kind) {
    case "managerAssessments":
      return REGENERATE_REPORT_BUCKET_LABELS.managerAssessments;
    case "screening":
      return REGENERATE_REPORT_BUCKET_LABELS.screening;
    case "profSbEducation":
      return REGENERATE_REPORT_BUCKET_LABELS.profSbEducation;
    case "burnout":
      return REGENERATE_REPORT_BUCKET_LABELS.burnout;
    default:
      return kind;
  }
}
