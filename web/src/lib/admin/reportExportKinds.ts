import { TEST_KIND_LABELS } from "@/lib/access/testKinds";

/** Типы тестов, доступные для массовой выгрузки отчётов. */
export const REPORT_EXPORT_TEST_KINDS = [
  "screening",
  "audit_middle",
  "audit_senior",
  "burnout",
  "prof_sb_education",
] as const;

export type ReportExportTestKind = (typeof REPORT_EXPORT_TEST_KINDS)[number];

export type ReportExportVariant = "full" | "manager";

/** Формат файлов выгрузки. */
export type ReportExportFileFormat = "pdf" | "docx" | "both";

export const REPORT_EXPORT_FILE_FORMAT_LABELS: Record<ReportExportFileFormat, string> = {
  pdf: "PDF",
  docx: "Word (.docx)",
  both: "PDF и Word",
};

export const REPORT_EXPORT_TEST_KIND_LABELS: Record<ReportExportTestKind, string> = {
  screening: TEST_KIND_LABELS.screening,
  audit_middle: TEST_KIND_LABELS.audit_middle,
  audit_senior: TEST_KIND_LABELS.audit_senior,
  burnout: TEST_KIND_LABELS.burnout,
  prof_sb_education: TEST_KIND_LABELS.prof_sb_education,
};

export type ReportExportScope = "all_latest" | "selected";

export type ReportExportCandidate = {
  sessionId: string;
  folderKey: string | null;
  lastName: string;
  firstName: string;
  displayName: string;
  completedAt: string;
};

/** Полный PDF HrD или отдельный PDF для руководителя (только ОД / ТУ). */
export function reportExportSupportsManagerVariant(testKind: ReportExportTestKind): boolean {
  return testKind === "audit_middle" || testKind === "audit_senior";
}

export function isReportExportTestKind(value: string): value is ReportExportTestKind {
  return (REPORT_EXPORT_TEST_KINDS as ReadonlyArray<string>).includes(value);
}
