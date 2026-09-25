import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import path from "path";

import type { ExecutiveManagerReportV1 } from "@/lib/audit/report/executiveManagerReportTypes";
import { AUDIT_PDF_H, AUDIT_PDF_W } from "@/lib/report/auditPdfLayout";
import { AI_REPORT_DISCLAIMER } from "@/lib/report/reportAiSectionLayout";
import { embedCyrillicFont, resolveReportFontsDir } from "@/lib/report/figmaReportPdfShell";

/** Стилистика как у сводного Word-отчёта: белый фон, тёмно-синие заголовки, без декора. */
const PAGE_W = AUDIT_PDF_W;
const PAGE_H = AUDIT_PDF_H;
/** ~0.75″ поля, как в референсном DOCX. */
const MARGIN = 54;
const CONTENT_X = MARGIN;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_TOP = PAGE_H - MARGIN;
const CONTENT_BOTTOM = MARGIN + 28;

const COLOR_TEXT = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.35, 0.35, 0.35);
const COLOR_HEADING = rgb(31 / 255, 56 / 255, 100 / 255);
const COLOR_HEADING_SOFT = rgb(46 / 255, 83 / 255, 149 / 255);
const COLOR_TABLE_HEADER = rgb(237 / 255, 242 / 255, 250 / 255);
const COLOR_TABLE_BORDER = rgb(0.75, 0.78, 0.82);
const COLOR_WHITE = rgb(1, 1, 1);

export type ExecutiveManagerPdfInput = {
  sessionId: string;
  report: ExecutiveManagerReportV1;
};

/**
 * PDF экспертного отчёта (собственник/HRD) в простой «документной» стилистике.
 */
export async function generateExecutiveManagerPdfBuffer(
  input: ExecutiveManagerPdfInput
): Promise<Buffer> {
  const fontDir = resolveReportFontsDir();
  const regBytes = readFileSync(path.join(fontDir, "NotoSans-Regular.ttf"));
  const boldBytes = readFileSync(path.join(fontDir, "NotoSans-Bold.ttf"));

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await embedCyrillicFont(doc, regBytes);
  const fontBold = await embedCyrillicFont(doc, boldBytes);

  const writer = new ExecutiveManagerPdfWriter(doc, font, fontBold);
  writer.render(input);
  writer.drawPageNumbers();

  return Buffer.from(await doc.save());
}

class ExecutiveManagerPdfWriter {
  readonly doc: PDFDocument;
  readonly font: PDFFont;
  readonly fontBold: PDFFont;
  page!: PDFPage;
  pageNum = 0;
  cursorY = 0;
  tableStackActive = false;

  constructor(doc: PDFDocument, font: PDFFont, fontBold: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.fontBold = fontBold;
  }

  render(input: ExecutiveManagerPdfInput): void {
    const report = input.report;
    this.startPage();

    this.drawParagraph("Экспертный отчёт по оценке руководителя", 16, true, COLOR_HEADING);
    this.drawGap(4);
    this.drawParagraph(report.fullName, 13, true, COLOR_TEXT);
    this.drawGap(2);
    this.drawParagraph(_profileLabel(report.reportProfile), 10, false, COLOR_MUTED);
    this.drawParagraph(`Сформирован: ${report.generatedAt}`, 9, false, COLOR_MUTED);
    this.drawGap(14);

    this.drawSectionTitle("Ключевой вывод");
    this.drawParagraph(report.keyTakeaway, 11, true, COLOR_TEXT);
    this.drawGap(10);

    this.drawSectionTitle("Цель оценки");
    this.drawParagraph(report.purpose, 10, false);
    this.drawGap(10);

    this.drawSectionTitle("Executive Summary");
    for (const para of report.executiveSummary.paragraphs) {
      this.drawParagraph(para, 10, false);
      this.drawGap(6);
    }
    this.drawGap(2);
    this.drawParagraph(
      `Ключевой вывод: ${report.executiveSummary.keyConclusion}`,
      10,
      true,
      COLOR_TEXT
    );

    this.drawSectionTitle("Общая управленческая оценка");
    if (report.overallAssessment.lead) {
      this.drawParagraph(report.overallAssessment.lead, 10, false);
      this.drawGap(4);
    }
    if (report.overallAssessment.bullets.length > 0) {
      this.drawParagraph("Результаты диагностики показывают:", 10, false);
      this.drawGap(3);
      this._drawBulletList(report.overallAssessment.bullets);
    }
    if (report.overallAssessment.closing) {
      this.drawGap(4);
      this.drawParagraph(report.overallAssessment.closing, 10, false);
    }

    this.drawSectionTitle("Сильные стороны руководителя");
    this.drawSubheading("Управленческие компетенции");
    this._drawBulletList(report.strengths.managerial);
    this.drawGap(4);
    this.drawSubheading("Личностные качества");
    this._drawBulletList(report.strengths.personal);

    this.drawSectionTitle("Мотивационный профиль");
    if (report.motivationProfile.lead) {
      this.drawParagraph(report.motivationProfile.lead, 10, false);
      this.drawGap(4);
    }
    this._drawBulletList(report.motivationProfile.drivers);

    this.drawSectionTitle("Управленческий стиль");
    if (report.managementStyle.lead) {
      this.drawParagraph(report.managementStyle.lead, 10, false);
      this.drawGap(4);
    }
    if (report.managementStyle.focusPoints.length > 0) {
      this.drawParagraph("Основной акцент руководитель делает на:", 10, false);
      this.drawGap(3);
      this._drawBulletList(report.managementStyle.focusPoints);
    }
    if (report.managementStyle.conflictNote) {
      this.drawGap(4);
      this.drawParagraph(report.managementStyle.conflictNote, 10, false);
    }
    if (report.managementStyle.bestFit.length > 0) {
      this.drawGap(6);
      this.drawParagraph("Наиболее эффективно проявляет себя там, где требуется:", 10, false);
      this.drawGap(3);
      this._drawBulletList(report.managementStyle.bestFit);
    }

    this.drawSectionTitle("Психоэмоциональное состояние");
    if (report.psychoEmotional.lead) {
      this.drawParagraph(report.psychoEmotional.lead, 10, false);
      this.drawGap(4);
    }
    this._drawBulletList(report.psychoEmotional.findings);
    if (report.psychoEmotional.implications.length > 0) {
      this.drawGap(4);
      this.drawParagraph("Практически это может проявляться следующим образом:", 10, false);
      this.drawGap(3);
      this._drawBulletList(report.psychoEmotional.implications);
    }
    if (report.psychoEmotional.closing) {
      this.drawGap(4);
      this.drawParagraph(report.psychoEmotional.closing, 10, false);
    }

    this.drawSectionTitle("Уровень рабочей загрузки");
    this.drawSubheading("Объективная нагрузка");
    this.drawParagraph(report.workload.objectiveLabel, 10, true);
    this.drawParagraph(report.workload.objectiveText, 10, false);
    this.drawGap(4);
    this.drawSubheading("Субъективное восприятие нагрузки");
    this.drawParagraph(report.workload.subjectiveLabel, 10, true);
    this.drawParagraph(report.workload.subjectiveText, 10, false);
    this.drawGap(4);
    this.drawSubheading("Эмоциональная нагрузка");
    this.drawParagraph(report.workload.emotionalLabel, 10, true);
    this.drawParagraph(report.workload.emotionalText, 10, false);
    this.drawGap(4);
    this.drawSubheading("Риск перегрузки");
    this.drawParagraph(report.workload.overloadRiskLabel, 10, true);
    if (report.workload.metricsTable.length > 0) {
      this.drawGap(8);
      this.drawTwoColTable("Показатель", "Оценка", report.workload.metricsTable);
    }
    if (report.workload.expertNote) {
      this.drawGap(6);
      this.drawParagraph(`Экспертный вывод: ${report.workload.expertNote}`, 10, false);
    }

    this.drawSectionTitle("Основные риски для бизнеса");
    if (report.businessRisks.length === 0) {
      this.drawParagraph(
        "Существенных бизнес-рисков по доступным сигналам не выявлено.",
        10,
        false
      );
    } else {
      for (const risk of report.businessRisks) {
        this.drawSubheading(risk.title);
        this.drawParagraph(risk.text, 10, false);
        this.drawGap(6);
      }
    }

    this.drawSectionTitle("Рекомендации собственнику и HRD");
    for (const group of report.recommendations.groups) {
      this.drawSubheading(group.title);
      this._drawBulletList(group.items);
      this.drawGap(4);
    }

    this.drawSectionTitle("Итоговое экспертное заключение");
    for (const para of report.finalConclusion.paragraphs) {
      this.drawParagraph(para, 10, false);
      this.drawGap(6);
    }
    if (report.finalConclusion.managerialVerdict) {
      this.drawGap(2);
      this.drawParagraph(
        `Итоговый управленческий вывод: ${report.finalConclusion.managerialVerdict}`,
        10,
        true,
        COLOR_TEXT
      );
    }

    this.drawSectionTitle("Итоговая экспертная оценка");
    this.drawTwoColTable("Критерий", "Оценка", report.scorecard);

    this.drawSectionTitle("HR-анализ по 14 направлениям");
    this.drawTwoColTable(
      "Раздел",
      "Содержание",
      report.hrAnalysis14.map((item, index) => ({
        label: `${String(index + 1)}. ${item.title}`,
        value: item.content,
      }))
    );

    this.drawGap(12);
    this.drawParagraph(AI_REPORT_DISCLAIMER, 8, false, COLOR_MUTED);
  }

  startPage(): void {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageNum += 1;
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: COLOR_WHITE,
    });
    this.cursorY = CONTENT_TOP;
    this.tableStackActive = false;
  }

  drawSectionTitle(title: string): void {
    this.ensureSpace(34);
    this.drawGap(12);
    this.page.drawText(title, {
      x: CONTENT_X,
      y: this.cursorY,
      size: 12,
      font: this.fontBold,
      color: COLOR_HEADING,
    });
    this.cursorY -= 8;
    this.page.drawLine({
      start: { x: CONTENT_X, y: this.cursorY },
      end: { x: CONTENT_X + CONTENT_W, y: this.cursorY },
      thickness: 0.8,
      color: COLOR_HEADING_SOFT,
    });
    this.cursorY -= 12;
  }

  drawSubheading(title: string): void {
    this.ensureSpace(22);
    this.page.drawText(title, {
      x: CONTENT_X,
      y: this.cursorY,
      size: 10.5,
      font: this.fontBold,
      color: COLOR_HEADING_SOFT,
    });
    this.cursorY -= 13;
  }

  _drawBulletList(items: ReadonlyArray<string>): void {
    if (items.length === 0) {
      this.drawParagraph("—", 10, false, COLOR_MUTED);
      return;
    }
    for (const item of items) {
      this.drawBullet(item);
    }
  }

  drawBullet(text: string): void {
    const size = 10;
    const lineH = size * 1.38;
    const bulletX = CONTENT_X;
    const textX = CONTENT_X + 14;
    const textW = CONTENT_W - 14;
    const lines = wrapLines(text, this.font, size, textW);
    this.ensureSpace(lineH * Math.max(lines.length, 1));
    this.page.drawText("•", {
      x: bulletX,
      y: this.cursorY,
      size,
      font: this.font,
      color: COLOR_TEXT,
    });
    for (const line of lines) {
      this.page.drawText(line, {
        x: textX,
        y: this.cursorY,
        size,
        font: this.font,
        color: COLOR_TEXT,
      });
      this.cursorY -= lineH;
    }
    this.cursorY -= 2;
  }

  drawTwoColTable(
    col1Header: string,
    col2Header: string,
    rows: ReadonlyArray<{ label: string; value: string }>
  ): void {
    this.ensureSpace(16);
    this.tableStackActive = false;
    this.drawTableRow(col1Header, col2Header, true);
    for (const row of rows) {
      this.drawTableRow(row.label, row.value, false);
    }
    this.tableStackActive = false;
    this.drawGap(4);
  }

  drawTableRow(key: string, value: string, header: boolean): void {
    const tableX = CONTENT_X;
    const tableW = CONTENT_W;
    const col1W = tableW * 0.38;
    const col2W = tableW - col1W;
    const padX = 6;
    const padY = 5;
    const size = 9;
    const lineH = size * 1.3;
    const keyFont = header ? this.fontBold : this.fontBold;
    const valFont = header ? this.fontBold : this.font;

    const keyLines = wrapLines(key, keyFont, size, col1W - padX * 2);
    const valLines = wrapLines(value, valFont, size, col2W - padX * 2);
    const rowLines = Math.max(keyLines.length, valLines.length, 1);
    const rowH = rowLines * lineH + padY * 2;

    this.ensureSpace(rowH);

    const top = this.tableStackActive ? this.cursorY : this.cursorY + size * 0.2;
    const bottom = top - rowH;

    if (header) {
      this.page.drawRectangle({
        x: tableX,
        y: bottom,
        width: tableW,
        height: rowH,
        color: COLOR_TABLE_HEADER,
      });
    }
    this.page.drawRectangle({
      x: tableX,
      y: bottom,
      width: tableW,
      height: rowH,
      borderColor: COLOR_TABLE_BORDER,
      borderWidth: 0.6,
    });
    this.page.drawLine({
      start: { x: tableX + col1W, y: top },
      end: { x: tableX + col1W, y: bottom },
      thickness: 0.6,
      color: COLOR_TABLE_BORDER,
    });

    let ty = top - padY - size;
    for (const line of keyLines) {
      this.page.drawText(line, {
        x: tableX + padX,
        y: ty,
        size,
        font: keyFont,
        color: header ? COLOR_HEADING : COLOR_TEXT,
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
        color: COLOR_TEXT,
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
    color: ReturnType<typeof rgb> = COLOR_TEXT
  ): void {
    const f = bold ? this.fontBold : this.font;
    const lines = wrapLines(text, f, size, CONTENT_W);
    const lineH = size * 1.4;
    for (const line of lines) {
      this.ensureSpace(lineH);
      if (line.length === 0) {
        this.cursorY -= lineH;
        continue;
      }
      this.page.drawText(line, {
        x: CONTENT_X,
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
    if (this.cursorY - minHeight >= CONTENT_BOTTOM) {
      return;
    }
    this.startPage();
  }

  drawPageNumbers(): void {
    const pages = this.doc.getPages();
    const total = pages.length;
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index]!;
      const label = `${String(index + 1)} / ${String(total)}`;
      const size = 8;
      const width = this.font.widthOfTextAtSize(label, size);
      page.drawText(label, {
        x: PAGE_W - MARGIN - width,
        y: MARGIN / 2,
        size,
        font: this.font,
        color: COLOR_MUTED,
      });
    }
  }
}

function _profileLabel(profile: ExecutiveManagerReportV1["reportProfile"]): string {
  switch (profile) {
    case "screening":
      return "Экспертная оценка руководителя · скрининг кандидата";
    case "tu_management_chef":
      return "Экспертная оценка руководителя · ТУ / шефы / управляющие";
    case "od_reserve":
      return "Экспертная оценка руководителя · ОД / кадровый резерв";
    default:
      return "Экспертная оценка руководителя";
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
