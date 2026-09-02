import type { PDFPage } from "pdf-lib";

import { FIGMA_REPORT_BRAND } from "@/lib/report/figmaReportPdfShell";

/** Маркер начала блока ИИ-отчёта в plain text (парсится PDF-рендером). */
export const AI_REPORT_SECTION_PREFIX = "[SECTION:";

export type AiReportSection = {
  title: string;
  body: string;
};

/**
 * Форматирует блок ИИ-отчёта с машиночитаемым заголовком (без «---»).
 */
export function formatAiReportSection(title: string, body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return "";
  }
  return `${AI_REPORT_SECTION_PREFIX}${title}]\n${trimmed}`;
}

/**
 * Разбирает текст ИИ-заключения на блоки по маркерам [SECTION:…].
 */
export function parseAiReportSections(text: string): ReadonlyArray<AiReportSection> {
  if (!text.includes(AI_REPORT_SECTION_PREFIX)) {
    return [];
  }
  const sections: AiReportSection[] = [];
  const parts = text.split(/(?=\[SECTION:[^\]]+\])/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const match = /^\[SECTION:([^\]]+)\]\s*\n?([\s\S]*)$/u.exec(trimmed);
    if (match !== null) {
      sections.push({ title: match[1]!, body: match[2]!.trim() });
    }
  }
  return sections;
}

export const AI_REPORT_DISCLAIMER =
  "Выводы сформированы по программе диагностики и не заменяют беседу с сотрудником и решение руководителя.";

/** Убирает [SECTION:…] для email и plain text (заголовок остаётся строкой). */
export function stripAiReportSectionMarkers(text: string): string {
  return text.replace(/\[SECTION:([^\]]+)\]\s*\n?/gu, "$1\n");
}

/** Длина акцентной черты относительно ширины колонки (как на обложке Figma). */
export const FIGMA_SECTION_RULE_WIDTH_RATIO = 0.55;

/**
 * Бирюзовая черта с затуханием справа (имитация gradient line из макета).
 */
export function drawFigmaSectionAccentRule(
  page: PDFPage,
  x: number,
  y: number,
  columnWidth: number,
  widthRatio = FIGMA_SECTION_RULE_WIDTH_RATIO
): void {
  const totalWidth = columnWidth * widthRatio;
  const segments = 28;
  const segmentWidth = totalWidth / segments;

  for (let i = 0; i < segments; i += 1) {
    const fade = 1 - i / segments;
    const opacity = fade * fade;
    page.drawLine({
      start: { x: x + i * segmentWidth, y },
      end: { x: x + (i + 1) * segmentWidth, y },
      thickness: 1.15,
      color: FIGMA_REPORT_BRAND,
      opacity: Math.max(0.04, opacity),
    });
  }
}
