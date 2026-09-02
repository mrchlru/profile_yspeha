import type { AuditReportNarrativeParagraphInput } from "@/lib/audit/report/auditNarrativeParagraph";

/** Одна нарративная секция PDF скрининга (тест с вводом и выделенным результатом). */
export type ScreeningReportNarrativeSection = {
  sectionIndex: number;
  title: string;
  paragraphs: ReadonlyArray<AuditReportNarrativeParagraphInput>;
};
