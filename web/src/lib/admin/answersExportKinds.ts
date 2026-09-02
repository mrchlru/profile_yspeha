import {
  REPORT_EXPORT_TEST_KIND_LABELS,
  REPORT_EXPORT_TEST_KINDS,
  type ReportExportCandidate,
  type ReportExportScope,
  type ReportExportTestKind,
} from "@/lib/admin/reportExportKinds";

export type AnswersExportFormat = "csv" | "json" | "both";

export type AnswersExportTableLayout = "combined" | "separate_per_person";

export const ANSWERS_EXPORT_FORMATS = ["csv", "json", "both"] as const;

export const ANSWERS_EXPORT_TABLE_LAYOUTS = ["combined", "separate_per_person"] as const;

export const ANSWERS_EXPORT_FORMAT_LABELS: Record<AnswersExportFormat, string> = {
  csv: "Таблица CSV (Excel)",
  json: "JSON (полные данные, ZIP)",
  both: "CSV + JSON в одном ZIP",
};

export const ANSWERS_EXPORT_TABLE_LAYOUT_LABELS: Record<AnswersExportTableLayout, string> = {
  combined: "Все люди в одной таблице (удобно сравнивать в строках)",
  separate_per_person: "Отдельная таблица на каждого человека (ZIP при нескольких)",
};

export {
  REPORT_EXPORT_TEST_KINDS,
  REPORT_EXPORT_TEST_KIND_LABELS,
  type ReportExportCandidate,
  type ReportExportScope,
  type ReportExportTestKind,
};
