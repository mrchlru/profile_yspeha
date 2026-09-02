import { HeadingLevel, Paragraph } from "docx";

import { buildBurnoutReportView } from "@/lib/admin/buildBurnoutReportView";
import { buildProfSbEducationReportView } from "@/lib/admin/buildProfSbEducationReportView";
import {
  packReportExportDocx,
  reportDocxBoldLead,
  reportDocxHeading,
  reportDocxParagraph,
} from "@/lib/admin/reportExportDocxShell";
import type { ReportExportVariant } from "@/lib/admin/reportExportKinds";
import { narrativeParagraphPlainText } from "@/lib/audit/report/auditNarrativeParagraph";
import type {
  AuditReportJson,
  AuditReportManagerBrief,
  AuditReportManagerLine,
} from "@/lib/audit/report/auditReportTypes";
import type { KotReportJson } from "@/lib/kot/kotReportTypes";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

function _parseAuditReport(value: unknown): AuditReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<AuditReportJson>;
  if (row.version !== 1 || !row.managerBrief || !Array.isArray(row.testBlocks)) {
    return null;
  }
  return row as AuditReportJson;
}

function _parseKotReport(value: unknown): KotReportJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<KotReportJson>;
  if (
    typeof row.rawScore !== "number" ||
    typeof row.maxScore !== "number" ||
    typeof row.kotIpLevelLabel !== "string" ||
    typeof row.kotIpNormNote !== "string"
  ) {
    return null;
  }
  return row as KotReportJson;
}

/**
 * Word-версия отчёта аудита (полный или для руководителя).
 */
export async function generateAuditReportDocxBySession(
  sessionId: string,
  variant: ReportExportVariant
): Promise<Buffer | null> {
  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      auditReport: true,
      createdAt: true,
    },
  });

  if (!row) {
    return null;
  }

  const report = _parseAuditReport(row.auditReport);
  if (!report) {
    return null;
  }

  const fullName = `${row.lastName} ${row.firstName}`.trim();
  const title =
    variant === "manager"
      ? `Отчёт для руководителя — ${fullName}`
      : `Отчёт HrD — ${fullName}`;

  const paragraphs: Paragraph[] = [
    reportDocxParagraph(`Сессия: ${row.sessionId}`),
    reportDocxParagraph(
      `Дата прохождения: ${formatMoscowDateTime(row.createdAt)}`
    ),
  ];

  if (variant === "manager") {
    paragraphs.push(..._managerBriefDocxParagraphs(report.managerBrief));
  } else {
    for (const section of report.narrativeSections ?? []) {
      paragraphs.push(reportDocxHeading(section.title, HeadingLevel.HEADING_2));
      for (const para of section.paragraphs) {
        paragraphs.push(reportDocxParagraph(narrativeParagraphPlainText(para)));
      }
    }
    paragraphs.push(reportDocxHeading("Отчёт для руководителя", HeadingLevel.HEADING_2));
    paragraphs.push(..._managerBriefDocxParagraphs(report.managerBrief));
  }

  return packReportExportDocx(title, paragraphs);
}

/**
 * Word-версия отчёта скрининга.
 */
export async function generateScreeningReportDocxBySession(sessionId: string): Promise<Buffer | null> {
  const row = await prisma.screeningSubmission.findUnique({
    where: { sessionId },
    select: {
      profileName: true,
      sessionId: true,
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
      kotReport: true,
      createdAt: true,
    },
  });

  if (!row) {
    return null;
  }

  const kotReport = _parseKotReport(row.kotReport);
  if (!kotReport) {
    return null;
  }

  const title = `Отчёт скрининга — ${row.profileName}`;
  const paragraphs: Paragraph[] = [
    reportDocxParagraph(`Сессия: ${row.sessionId}`),
    reportDocxParagraph(`Дата: ${formatMoscowDateTime(row.createdAt)}`),
    reportDocxHeading("Результаты КОТ", HeadingLevel.HEADING_2),
    reportDocxParagraph(
      `Сырой балл: ${String(kotReport.rawScore)} / ${String(kotReport.maxScore)}`
    ),
    reportDocxParagraph(`Уровень КОТ-IP: ${kotReport.kotIpLevelLabel}`),
    reportDocxParagraph(kotReport.kotIpNormNote),
  ];

  if (kotReport.conclusionText) {
    paragraphs.push(reportDocxHeading("Заключение", HeadingLevel.HEADING_2));
    paragraphs.push(reportDocxParagraph(kotReport.conclusionText));
  }

  const recommendations = kotReport.hiringRecommendations ?? [];
  if (recommendations.length > 0) {
    paragraphs.push(reportDocxHeading("Рекомендации по найму", HeadingLevel.HEADING_2));
    for (const line of recommendations) {
      paragraphs.push(reportDocxParagraph(`• ${line}`));
    }
  }

  return packReportExportDocx(title, paragraphs);
}

/**
 * Word-версия отчёта выгорания.
 */
export async function generateBurnoutReportDocxBySession(sessionId: string): Promise<Buffer | null> {
  const view = await buildBurnoutReportView(sessionId);
  if (!view) {
    return null;
  }

  const title = `Тест на выгорание — ${view.personName}`;
  const paragraphs: Paragraph[] = [
    reportDocxParagraph(`Пройден: ${formatMoscowDateTime(view.createdAt)}`),
    reportDocxHeading(view.interpretation.verdictTitle, HeadingLevel.HEADING_2),
    reportDocxParagraph(view.interpretation.verdictText),
    reportDocxHeading("Шкалы", HeadingLevel.HEADING_2),
  ];

  for (const row of [view.interpretation.ee, view.interpretation.dp, view.interpretation.pa]) {
    paragraphs.push(
      reportDocxParagraph(`${row.title}: ${String(row.score)} — ${row.levelLabel}`)
    );
  }

  if (view.interpretation.recommendationLines.length > 0) {
    paragraphs.push(reportDocxHeading("Рекомендации", HeadingLevel.HEADING_2));
    for (const line of view.interpretation.recommendationLines) {
      paragraphs.push(reportDocxParagraph(`• ${line}`));
    }
  }

  return packReportExportDocx(title, paragraphs);
}

/**
 * Word-версия отчёта ПРОФ СБ + образование.
 */
export async function generateProfSbEducationReportDocxBySession(
  sessionId: string
): Promise<Buffer | null> {
  const view = await buildProfSbEducationReportView(sessionId);
  if (!view) {
    return null;
  }

  const status =
    view.report?.status === "computed"
      ? "Интерпретация рассчитана"
      : "Ожидает методики / ключей подсчёта";

  const title = `ПРОФ СБ + ПРОФ образование — ${view.personName}`;
  const paragraphs: Paragraph[] = [
    reportDocxParagraph(`${view.createdAt} · ${status}`),
    reportDocxHeading("Ответы", HeadingLevel.HEADING_2),
    reportDocxParagraph(JSON.stringify(view.answers, null, 2)),
  ];

  return packReportExportDocx(title, paragraphs);
}

function _managerBriefDocxParagraphs(brief: AuditReportManagerBrief): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const line of brief.testLines) {
    paragraphs.push(..._managerLineDocxParagraphs(line));
  }
  if (brief.aiConclusion && brief.aiConclusion.trim().length > 0) {
    paragraphs.push(reportDocxHeading("Итоговый вывод", HeadingLevel.HEADING_3));
    paragraphs.push(reportDocxParagraph(brief.aiConclusion));
  }
  return paragraphs;
}

function _managerLineDocxParagraphs(line: AuditReportManagerLine): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const indexLabel = `${String(line.blockIndex)}. ${line.title}`;
  if (line.alertHeadline) {
    paragraphs.push(reportDocxBoldLead(indexLabel, line.alertHeadline));
    if (line.alertFootnote) {
      paragraphs.push(reportDocxParagraph(line.alertFootnote));
    }
  } else if (line.maslachBrief) {
    paragraphs.push(reportDocxHeading(indexLabel, HeadingLevel.HEADING_3));
    paragraphs.push(reportDocxBoldLead(line.maslachBrief.overallTitle, line.maslachBrief.overallText));
    for (const scale of line.maslachBrief.scales) {
      paragraphs.push(reportDocxParagraph(`${scale.scaleTitle}: ${scale.statusLabel}`));
    }
  } else {
    paragraphs.push(reportDocxBoldLead(indexLabel, line.briefAnswer));
  }
  return paragraphs;
}
