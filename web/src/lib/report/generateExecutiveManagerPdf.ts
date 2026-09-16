import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import path from "path";

import type { ExecutiveManagerReportV1 } from "@/lib/audit/report/executiveManagerReportTypes";
import { AUDIT_PDF_H, AUDIT_PDF_W } from "@/lib/report/auditPdfLayout";
import {
  AI_REPORT_DISCLAIMER,
  drawFigmaSectionAccentRule,
} from "@/lib/report/reportAiSectionLayout";
import {
  applyFigmaPageBackgroundWithBrand,
  drawFigmaCoverDecor,
  embedCyrillicFont,
  FIGMA_CONTENT_BOTTOM,
  FIGMA_FLOW_TEXT_W,
  FIGMA_FLOW_TEXT_X,
  FIGMA_FLOW_TOP,
  FIGMA_REPORT_BRAND,
  FIGMA_REPORT_TEXT,
  FIGMA_REPORT_TEXT_MUTED,
  finalizeFigmaPageNumbers,
  readFigmaBackgroundBytes,
  resolveReportFontsDir,
  type FigmaCoverDecorConfig,
} from "@/lib/report/figmaReportPdfShell";
import {
  loadReportBrandPdfStamp,
  type ReportBrandPdfStamp,
} from "@/lib/report/reportBrandPdf";

const EXECUTIVE_COVER_DECOR: FigmaCoverDecorConfig = {
  headerRightLines: ["ЭКСПЕРТНЫЙ ОТЧЁТ", "СОБСТВЕННИК / HRD", "ОТЧЁТ"],
  titleLine1: "ЭКСПЕРТНЫЙ ОТЧЁТ —",
  titleLine2: "СОБСТВЕННИК / HRD",
};

export type ExecutiveManagerPdfInput = {
  sessionId: string;
  report: ExecutiveManagerReportV1;
};

/**
 * Формирует многостраничный PDF экспертного отчёта (без лимита 3 стр. managerBrief).
 */
export async function generateExecutiveManagerPdfBuffer(
  input: ExecutiveManagerPdfInput
): Promise<Buffer> {
  const fontDir = resolveReportFontsDir();
  const regBytes = readFileSync(path.join(fontDir, "NotoSans-Regular.ttf"));
  const boldBytes = readFileSync(path.join(fontDir, "NotoSans-Bold.ttf"));
  const bgBytes = readFigmaBackgroundBytes();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await embedCyrillicFont(doc, regBytes);
  const fontBold = await embedCyrillicFont(doc, boldBytes);
  const background = await doc.embedPng(bgBytes);
  const brand = await loadReportBrandPdfStamp(doc);

  const writer = new ExecutiveManagerPdfWriter(doc, font, fontBold, background, brand);
  writer.render(input);
  finalizeFigmaPageNumbers(doc, fontBold);

  return Buffer.from(await doc.save());
}

class ExecutiveManagerPdfWriter {
  readonly doc: PDFDocument;
  readonly font: PDFFont;
  readonly fontBold: PDFFont;
  readonly background: PDFImage;
  readonly brand: ReportBrandPdfStamp | null;
  page!: PDFPage;
  pageNum = 0;
  cursorY = 0;
  tableStackActive = false;

  constructor(
    doc: PDFDocument,
    font: PDFFont,
    fontBold: PDFFont,
    background: PDFImage,
    brand: ReportBrandPdfStamp | null
  ) {
    this.doc = doc;
    this.font = font;
    this.fontBold = fontBold;
    this.background = background;
    this.brand = brand;
  }

  render(input: ExecutiveManagerPdfInput): void {
    const report = input.report;
    this.startCoverPage();
    drawFigmaCoverDecor(this.page, this.fontBold, EXECUTIVE_COVER_DECOR);
    this.drawSectionHeader("УЧАСТНИК");
    this.drawParagraph(report.fullName.toUpperCase(), 12, true);
    this.drawGap(4);
    this.drawParagraph(`Профиль: ${_profileLabel(report.reportProfile)}`, 9, false, FIGMA_REPORT_TEXT_MUTED);
    this.drawParagraph(`Session ID: ${input.sessionId}`, 8, false, FIGMA_REPORT_TEXT_MUTED);
    this.drawParagraph(`Сформирован: ${report.generatedAt}`, 8, false, FIGMA_REPORT_TEXT_MUTED);
    this.drawGap(14);

    this.drawSectionHeader("КЛЮЧЕВОЙ ВЫВОД");
    this.drawParagraph(report.keyTakeaway, 11, true, FIGMA_REPORT_BRAND);
    this.drawGap(10);

    this.drawSectionHeader("ЦЕЛЬ ОТЧЁТА");
    this.drawParagraph(report.purpose, 9.5, false);
    this.drawGap(8);

    this.drawSectionHeader("КРАТКОЕ РЕЗЮМЕ");
    for (const para of report.executiveSummary.paragraphs) {
      this.drawParagraph(para, 9.5, false);
      this.drawGap(5);
    }
    this.drawGap(2);
    this.drawParagraph("Ключевой вывод:", 9, true);
    this.drawParagraph(report.executiveSummary.keyConclusion, 9.5, true, FIGMA_REPORT_BRAND);

    this.startSection("ОБЩАЯ ОЦЕНКА");
    if (report.overallAssessment.lead) {
      this.drawParagraph(report.overallAssessment.lead, 9.5, false);
      this.drawGap(4);
    }
    for (const bullet of report.overallAssessment.bullets) {
      this.drawParagraph(`• ${bullet}`, 9.5, false);
      this.drawGap(2);
    }
    if (report.overallAssessment.closing) {
      this.drawGap(4);
      this.drawParagraph(report.overallAssessment.closing, 9.5, false);
    }

    this.startSection("СИЛЬНЫЕ СТОРОНЫ");
    this.drawSubheader("Управленческие");
    this._drawBulletList(report.strengths.managerial);
    this.drawSubheader("Личностные");
    this._drawBulletList(report.strengths.personal);

    this.startSection("МОТИВАЦИОННЫЙ ПРОФИЛЬ");
    if (report.motivationProfile.lead) {
      this.drawParagraph(report.motivationProfile.lead, 9.5, false);
      this.drawGap(4);
    }
    this._drawBulletList(report.motivationProfile.drivers);

    this.startSection("СТИЛЬ УПРАВЛЕНИЯ");
    if (report.managementStyle.lead) {
      this.drawParagraph(report.managementStyle.lead, 9.5, false);
      this.drawGap(4);
    }
    this._drawBulletList(report.managementStyle.focusPoints);
    if (report.managementStyle.conflictNote) {
      this.drawGap(4);
      this.drawParagraph(report.managementStyle.conflictNote, 9.5, false);
    }
    if (report.managementStyle.bestFit.length > 0) {
      this.drawGap(6);
      this.drawSubheader("Наилучшее применение");
      this._drawBulletList(report.managementStyle.bestFit);
    }

    this.startSection("ПСИХОЭМОЦИОНАЛЬНОЕ СОСТОЯНИЕ");
    if (report.psychoEmotional.lead) {
      this.drawParagraph(report.psychoEmotional.lead, 9.5, false);
      this.drawGap(4);
    }
    this._drawBulletList(report.psychoEmotional.findings);
    if (report.psychoEmotional.implications.length > 0) {
      this.drawGap(4);
      this.drawSubheader("Следствия для управления");
      this._drawBulletList(report.psychoEmotional.implications);
    }
    if (report.psychoEmotional.closing) {
      this.drawGap(4);
      this.drawParagraph(report.psychoEmotional.closing, 9.5, false);
    }

    this.startSection("ЗАГРУЗКА И РИСК ПЕРЕГРУЗКИ");
    this.drawParagraph(
      `${report.workload.objectiveLabel}: ${report.workload.objectiveText}`,
      9.5,
      false
    );
    this.drawGap(4);
    this.drawParagraph(
      `${report.workload.subjectiveLabel}: ${report.workload.subjectiveText}`,
      9.5,
      false
    );
    this.drawGap(4);
    this.drawParagraph(
      `${report.workload.emotionalLabel}: ${report.workload.emotionalText}`,
      9.5,
      false
    );
    this.drawGap(4);
    this.drawParagraph(`Риск перегрузки: ${report.workload.overloadRiskLabel}`, 9.5, true);
    if (report.workload.metricsTable.length > 0) {
      this.drawGap(8);
      this.drawTwoColTable("Показатели загрузки", "Параметр", "Значение", report.workload.metricsTable);
    }
    if (report.workload.expertNote) {
      this.drawGap(6);
      this.drawParagraph(report.workload.expertNote, 9.5, false);
    }

    this.startSection("РИСКИ ДЛЯ БИЗНЕСА");
    if (report.businessRisks.length === 0) {
      this.drawParagraph("Существенных бизнес-рисков по доступным сигналам не выявлено.", 9.5, false);
    } else {
      for (const risk of report.businessRisks) {
        this.drawParagraph(risk.title, 9.5, true, FIGMA_REPORT_BRAND);
        this.drawParagraph(risk.text, 9.5, false);
        this.drawGap(6);
      }
    }

    this.startSection("РЕКОМЕНДАЦИИ");
    for (const group of report.recommendations.groups) {
      this.drawSubheader(group.title);
      this._drawBulletList(group.items);
      this.drawGap(4);
    }

    this.startSection("ИТОГОВОЕ ЗАКЛЮЧЕНИЕ");
    for (const para of report.finalConclusion.paragraphs) {
      this.drawParagraph(para, 9.5, false);
      this.drawGap(5);
    }
    if (report.finalConclusion.managerialVerdict) {
      this.drawGap(2);
      this.drawParagraph("Управленческий вердикт:", 9, true);
      this.drawParagraph(report.finalConclusion.managerialVerdict, 9.5, true, FIGMA_REPORT_BRAND);
    }

    this.startSection("SCORECARD");
    this.drawTwoColTable("Оценка по критериям", "Критерий", "Оценка", report.scorecard);

    this.startSection("HR-АНАЛИЗ (14 НАПРАВЛЕНИЙ)");
    report.hrAnalysis14.forEach((item, index) => {
      this.ensureSpace(36);
      this.drawParagraph(`${String(index + 1)}. ${item.title}`, 9.5, true, FIGMA_REPORT_BRAND);
      this.drawGap(2);
      this.drawParagraph(item.content, 9.5, false);
      this.drawGap(8);
    });

    this.drawGap(10);
    this.drawParagraph(AI_REPORT_DISCLAIMER, 8, false, FIGMA_REPORT_TEXT_MUTED);
  }

  startCoverPage(): void {
    this.page = this.doc.addPage([AUDIT_PDF_W, AUDIT_PDF_H]);
    this.pageNum = 1;
    applyFigmaPageBackgroundWithBrand(this.page, this.background, this.brand);
    this.cursorY = FIGMA_FLOW_TOP;
  }

  startSection(title: string): void {
    this.addContinuationPage();
    this.drawSectionHeader(title);
  }

  addContinuationPage(): void {
    this.page = this.doc.addPage([AUDIT_PDF_W, AUDIT_PDF_H]);
    this.pageNum += 1;
    applyFigmaPageBackgroundWithBrand(this.page, this.background, this.brand);
    this.cursorY = FIGMA_FLOW_TOP;
  }

  drawSectionHeader(title: string): void {
    this.ensureSpace(30);
    this.page.drawText(title, {
      x: FIGMA_FLOW_TEXT_X,
      y: this.cursorY,
      size: 10,
      font: this.fontBold,
      color: FIGMA_REPORT_BRAND,
    });
    this.cursorY -= 14;
    drawFigmaSectionAccentRule(this.page, FIGMA_FLOW_TEXT_X, this.cursorY, FIGMA_FLOW_TEXT_W);
    this.cursorY -= 12;
  }

  drawSubheader(title: string): void {
    this.ensureSpace(22);
    this.page.drawText(title, {
      x: FIGMA_FLOW_TEXT_X,
      y: this.cursorY,
      size: 9.5,
      font: this.fontBold,
      color: FIGMA_REPORT_TEXT,
    });
    this.cursorY -= 12;
  }

  _drawBulletList(items: ReadonlyArray<string>): void {
    if (items.length === 0) {
      this.drawParagraph("—", 9.5, false, FIGMA_REPORT_TEXT_MUTED);
      return;
    }
    for (const item of items) {
      this.drawParagraph(`• ${item}`, 9.5, false);
      this.drawGap(2);
    }
  }

  drawTwoColTable(
    caption: string,
    col1Header: string,
    col2Header: string,
    rows: ReadonlyArray<{ label: string; value: string }>
  ): void {
    this.ensureSpace(14);
    this.drawParagraph(caption, 9, true);
    this.drawGap(2);
    this.tableStackActive = false;
    this.drawTableRow(col1Header, col2Header, true);
    for (const row of rows) {
      this.drawTableRow(row.label, row.value, false);
    }
    this.tableStackActive = false;
    this.drawGap(4);
  }

  drawTableRow(key: string, value: string, header: boolean): void {
    const tableX = FIGMA_FLOW_TEXT_X;
    const tableW = FIGMA_FLOW_TEXT_W;
    const col1W = tableW * 0.44;
    const col2W = tableW - col1W;
    const padX = 5;
    const padY = 4;
    const size = 8.5;
    const lineH = size * 1.32;
    const keyFont = header ? this.fontBold : this.font;
    const valFont = header ? this.fontBold : this.font;
    const keyColor = header ? FIGMA_REPORT_TEXT : FIGMA_REPORT_BRAND;

    const keyLines = wrapLines(key, keyFont, size, col1W - padX * 2);
    const valLines = wrapLines(value, valFont, size, col2W - padX * 2);
    const rowLines = Math.max(keyLines.length, valLines.length, 1);
    const rowH = rowLines * lineH + padY * 2;

    this.ensureSpace(rowH);

    const top = this.tableStackActive ? this.cursorY : this.cursorY + size;
    const bottom = top - rowH;
    const borderColor = rgb(0.82, 0.82, 0.82);

    if (header) {
      this.page.drawRectangle({
        x: tableX,
        y: bottom,
        width: tableW,
        height: rowH,
        color: rgb(0.95, 0.96, 0.96),
      });
    }
    this.page.drawRectangle({
      x: tableX,
      y: bottom,
      width: tableW,
      height: rowH,
      borderColor,
      borderWidth: 0.6,
    });
    this.page.drawLine({
      start: { x: tableX + col1W, y: top },
      end: { x: tableX + col1W, y: bottom },
      thickness: 0.6,
      color: borderColor,
    });

    let ty = top - padY - size;
    for (const line of keyLines) {
      this.page.drawText(line, {
        x: tableX + padX,
        y: ty,
        size,
        font: keyFont,
        color: keyColor,
      });
      ty -= lineH;
    }
    ty = top - padY - size;
    for (const line of valLines) {
      this.page.drawText(line, {
        x: tableX + col1W + padX,
        y: ty,
        size,
        font: valFont,
        color: FIGMA_REPORT_TEXT,
      });
      ty -= lineH;
    }

    this.cursorY = bottom;
    this.tableStackActive = true;
  }

  drawParagraph(
    text: string,
    size: number,
    bold: boolean,
    color: ReturnType<typeof rgb> = FIGMA_REPORT_TEXT
  ): void {
    const f = bold ? this.fontBold : this.font;
    const lines = wrapLines(text, f, size, FIGMA_FLOW_TEXT_W);
    const lineH = size * 1.4;
    for (const line of lines) {
      this.ensureSpace(lineH);
      if (line.length === 0) {
        this.cursorY -= lineH;
        continue;
      }
      this.page.drawText(line, {
        x: FIGMA_FLOW_TEXT_X,
        y: this.cursorY,
        size,
        font: f,
        color,
      });
      this.cursorY -= lineH;
    }
  }

  drawGap(pt: number): void {
    this.cursorY -= pt;
  }

  ensureSpace(minHeight: number): void {
    if (this.cursorY - minHeight >= FIGMA_CONTENT_BOTTOM) {
      return;
    }
    this.addContinuationPage();
    this.page.drawText("(продолжение)", {
      x: FIGMA_FLOW_TEXT_X,
      y: this.cursorY,
      size: 8,
      font: this.font,
      color: FIGMA_REPORT_TEXT_MUTED,
    });
    this.cursorY -= 14;
  }
}

function _profileLabel(profile: ExecutiveManagerReportV1["reportProfile"]): string {
  switch (profile) {
    case "screening":
      return "Скрининг кандидата";
    case "tu_management_chef":
      return "ТУ / шефы / управляющие";
    case "od_reserve":
      return "ОД / кадровый резерв";
    default:
      return "Экспертная оценка";
  }
}

function wrapLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return [""];
  }
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current.length > 0) {
      lines.push(current);
    }
    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word;
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      const next = `${chunk}${ch}`;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk.length > 0) {
          lines.push(chunk);
        }
        chunk = ch;
      }
    }
    current = chunk;
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}
