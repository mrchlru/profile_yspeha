import { HeadingLevel, type Paragraph } from "docx";

import type { AttestationReportView } from "@/lib/admin/buildAttestationReportView";
import {
  reportDocxHeading,
  reportDocxParagraph,
} from "@/lib/admin/reportExportDocxShell";
import {
  CBI_SCALE_LABELS,
  KLIMOV_TYPE_LABELS,
  MANAGEMENT_POTENTIAL_SCALE_LABELS,
  MINI_IPIP_FACTOR_LABELS,
  MINI_IPIP_FACTOR_ORDER,
  SPIELBERGER_SCALE_LABELS,
  scoreBandLabel,
} from "@/lib/attestation/attestationLabels";
import type { KlimovProfessionType } from "@/lib/attestation/attestationQuestions";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";

const KLIMOV_ORDER: ReadonlyArray<KlimovProfessionType> = [
  "human_nature",
  "human_technique",
  "human_human",
  "human_sign_system",
  "human_artistic_image",
];

/**
 * Абзацы Word-отчёта аттестации по данным просмотра в админке.
 */
export function buildAttestationReportDocxParagraphs(view: AttestationReportView): Paragraph[] {
  const { report } = view;
  const scores = report.scores;
  const paragraphs: Paragraph[] = [
    reportDocxParagraph(`Сессия: ${view.sessionId}`),
    reportDocxParagraph(`Пройден: ${formatMoscowDateTime(view.createdAt)}`),
    reportDocxParagraph(
      report.computedAt ? `Рассчитано: ${report.computedAt}` : "Расчёт: по сохранённым ответам"
    ),
  ];

  paragraphs.push(reportDocxHeading("Mini-IPIP (Big Five)", HeadingLevel.HEADING_2));
  for (const factor of MINI_IPIP_FACTOR_ORDER) {
    paragraphs.push(
      reportDocxParagraph(`${MINI_IPIP_FACTOR_LABELS[factor]}: ${String(scores.miniIpip[factor])}`)
    );
  }

  paragraphs.push(reportDocxHeading("Управленческий потенциал", HeadingLevel.HEADING_2));
  for (const row of scores.managementPotential) {
    const label = MANAGEMENT_POTENTIAL_SCALE_LABELS[row.scale];
    paragraphs.push(
      reportDocxParagraph(
        `${label}: сумма ${String(row.sum)} — ${scoreBandLabel(row.band)}`
      )
    );
  }

  paragraphs.push(reportDocxHeading("CBI (выгорание)", HeadingLevel.HEADING_2));
  for (const row of scores.cbi) {
    paragraphs.push(
      reportDocxParagraph(
        `${CBI_SCALE_LABELS[row.scale]}: среднее ${row.mean.toFixed(2)} — ${scoreBandLabel(row.band)}`
      )
    );
  }

  paragraphs.push(reportDocxHeading("Шпилбергер (тревожность)", HeadingLevel.HEADING_2));
  for (const row of scores.spielberger) {
    paragraphs.push(
      reportDocxParagraph(
        `${SPIELBERGER_SCALE_LABELS[row.scale]}: ${String(row.total)} — ${scoreBandLabel(row.band)}`
      )
    );
  }

  paragraphs.push(reportDocxHeading("Климов (ДДО)", HeadingLevel.HEADING_2));
  for (const type of KLIMOV_ORDER) {
    paragraphs.push(
      reportDocxParagraph(`${KLIMOV_TYPE_LABELS[type]}: ${String(scores.klimovDdo[type] ?? 0)}`)
    );
  }

  if (scores.luscher) {
    paragraphs.push(reportDocxHeading("Люшер (цветовой тест)", HeadingLevel.HEADING_2));
    paragraphs.push(reportDocxParagraph(`SO: ${scores.luscher.so.toFixed(1)}`));
    paragraphs.push(reportDocxParagraph(`VK: ${scores.luscher.vk.toFixed(2)}`));
  }

  const summary = report.rosenzweigCodingSummary;
  if (summary && summary.codedCount > 0) {
    paragraphs.push(reportDocxHeading("Розенцвейг — кодирование", HeadingLevel.HEADING_2));
    paragraphs.push(
      reportDocxParagraph(
        `Закодировано ситуаций: ${String(summary.codedCount)} из ${String(summary.totalSituations)}`
      )
    );
    for (const item of summary.directions) {
      paragraphs.push(
        reportDocxParagraph(
          `Направление ${item.key}: ${String(item.count)} (${Math.round(item.share * 100)}%)`
        )
      );
    }
    for (const item of summary.reactions) {
      paragraphs.push(
        reportDocxParagraph(
          `Реакция ${item.key}: ${String(item.count)} (${Math.round(item.share * 100)}%)`
        )
      );
    }
  }

  if (report.conclusionText?.trim()) {
    paragraphs.push(reportDocxHeading("Заключение", HeadingLevel.HEADING_2));
    paragraphs.push(reportDocxParagraph(report.conclusionText.trim()));
  }

  if (report.managerActions?.trim()) {
    paragraphs.push(reportDocxHeading("Рекомендации для HRD", HeadingLevel.HEADING_2));
    paragraphs.push(reportDocxParagraph(report.managerActions.trim()));
  }

  return paragraphs;
}
