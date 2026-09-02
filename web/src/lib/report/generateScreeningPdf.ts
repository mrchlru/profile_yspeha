import { readFileSync } from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";

import type { GerchikovStep2Data } from "@/lib/gerchikov/step2Types";
import { likertAnswerToScore } from "@/lib/step3/step3LikertScore";
import type { Step1Data, Step3Data, Step4Data } from "@/store/useFormStore";
import { buildStep4ReportSections } from "@/lib/step4/step4Labels";
import { AUDIT_PDF_H, AUDIT_PDF_W } from "@/lib/report/auditPdfLayout";
import {
  normalizeNarrativeParagraph,
  type AuditReportNarrativeParagraphInput,
} from "@/lib/audit/report/auditNarrativeParagraph";
import {
  buildScreeningAiConclusionText,
  isScreeningConclusionSectionHeader,
} from "@/lib/ai/renderScreeningAiConclusion";
import {
  AI_REPORT_DISCLAIMER,
  drawFigmaSectionAccentRule,
} from "@/lib/report/reportAiSectionLayout";
import { buildScreeningNarrativeSections } from "@/lib/screening/report/buildScreeningNarrativeSections";
import type { ScreeningReportNarrativeSection } from "@/lib/screening/report/screeningReportTypes";
import {
  applyFigmaPageBackgroundWithBrand,
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
  SCREENING_COVER_DECOR,
  drawFigmaCoverDecor,
} from "@/lib/report/figmaReportPdfShell";
import {
  loadReportBrandPdfStamp,
  type ReportBrandPdfStamp,
} from "@/lib/report/reportBrandPdf";

export type ScreeningPdfInput = {
  profileName: string;
  sessionId: string;
  rawScore: number;
  maxScore: number;
  kotIp: number;
  kotIpLevelLabel: string;
  kotIpNormNote: string;
  step1: Step1Data;
  step2: GerchikovStep2Data;
  step3: Step3Data;
  step4: Step4Data;
  conclusionText: string | null;
  hiringRecommendations: string | null;
};

const CONTENT_X = FIGMA_FLOW_TEXT_X;
const CONTENT_W = FIGMA_FLOW_TEXT_W;

const NARRATIVE_BODY_SIZE = 9.5;
const NARRATIVE_HIGHLIGHT_SIZE = 12;
const NARRATIVE_HIGHLIGHT_INLINE_SIZE = 11;
const NARRATIVE_BLOCK_INDENT = 42;

/** Фирменный акцент (#00B596) — для диаграмм. */
const BRAND_DEEP = rgb(0 / 255, 140 / 255, 118 / 255);
const TEXT = FIGMA_REPORT_TEXT;
const TEXT_MUTED = FIGMA_REPORT_TEXT_MUTED;
const BORDER = rgb(0.88, 0.88, 0.88);
const CHART_FILL = rgb(0.99, 0.99, 0.99);
const HIGHLIGHT = rgb(0.96, 0.83, 0.29);

function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

function wrapLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  const paragraphs = normalized.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const test = line.length > 0 ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        line = test;
      } else {
        if (line.length > 0) {
          out.push(line);
        }
        line = w;
      }
    }
    if (line.length > 0) {
      out.push(line);
    }
  }
  return out;
}

type StyledWordToken = {
  word: string;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
};

function _appendWords(
  tokens: StyledWordToken[],
  text: string,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>
): void {
  const words = text.split(/\s+/).filter(Boolean);
  for (const word of words) {
    tokens.push({ word, font, size, color });
  }
}

function _buildInlineResultTokens(
  prefix: string,
  highlight: string,
  suffix: string,
  regularFont: PDFFont,
  boldFont: PDFFont
): StyledWordToken[] {
  const tokens: StyledWordToken[] = [];
  if (prefix.trim().length > 0) {
    _appendWords(tokens, prefix, regularFont, NARRATIVE_BODY_SIZE, FIGMA_REPORT_TEXT);
  }
  _appendWords(
    tokens,
    highlight,
    boldFont,
    NARRATIVE_HIGHLIGHT_INLINE_SIZE,
    FIGMA_REPORT_BRAND
  );
  if (suffix.trim().length > 0) {
    _appendWords(tokens, suffix, regularFont, NARRATIVE_BODY_SIZE, FIGMA_REPORT_TEXT);
  }
  return tokens;
}

function _layoutStyledTokens(
  tokens: ReadonlyArray<StyledWordToken>,
  maxWidth: number
): StyledWordToken[][] {
  const lines: StyledWordToken[][] = [];
  let line: StyledWordToken[] = [];
  let lineWidth = 0;

  for (const token of tokens) {
    const spaceWidth =
      line.length > 0
        ? line[line.length - 1]!.font.widthOfTextAtSize(" ", line[line.length - 1]!.size)
        : 0;
    const wordWidth = token.font.widthOfTextAtSize(token.word, token.size);
    const nextWidth = lineWidth + (line.length > 0 ? spaceWidth : 0) + wordWidth;
    if (line.length > 0 && nextWidth > maxWidth) {
      lines.push(line);
      line = [token];
      lineWidth = wordWidth;
    } else {
      line.push(token);
      lineWidth = nextWidth;
    }
  }
  if (line.length > 0) {
    lines.push(line);
  }
  return lines;
}

class PdfWriter {
  readonly doc: PDFDocument;
  readonly font: PDFFont;
  readonly fontBold: PDFFont;
  readonly background: PDFImage;
  readonly brand: ReportBrandPdfStamp | null;
  page!: PDFPage;
  pageNum = 0;
  y = 0;
  /** Разрешить автоперенос на следующую страницу внутри текущего раздела. */
  private allowPageBreaks = true;

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

  /** Новый раздел отчёта — с отдельной страницы (без метки «продолжение»). */
  startSectionPage(allowPageBreaks: boolean): void {
    this.addPage(false);
    this.allowPageBreaks = allowPageBreaks;
  }

  addPage(continuation: boolean, withCoverDecor = false): void {
    this.page = this.doc.addPage([AUDIT_PDF_W, AUDIT_PDF_H]);
    this.pageNum += 1;
    applyFigmaPageBackgroundWithBrand(this.page, this.background, this.brand);
    if (withCoverDecor) {
      drawFigmaCoverDecor(this.page, this.fontBold, SCREENING_COVER_DECOR);
    }
    this.y = FIGMA_FLOW_TOP;
    if (continuation) {
      this.page.drawText("(продолжение)", {
        x: CONTENT_X,
        y: this.y,
        size: 8,
        font: this.font,
        color: TEXT_MUTED,
      });
      this.y -= 14;
    }
  }

  needSpace(pts: number): void {
    if (this.y - pts < FIGMA_CONTENT_BOTTOM && this.allowPageBreaks) {
      this.addPage(true);
    }
  }

  coverSectionHeader(title: string): void {
    this.needSpace(22);
    this.page.drawText(title, {
      x: CONTENT_X,
      y: this.y,
      size: 10,
      font: this.fontBold,
      color: FIGMA_REPORT_BRAND,
    });
    this.y -= 14;
    drawFigmaSectionAccentRule(this.page, CONTENT_X, this.y, CONTENT_W);
    this.y -= 12;
  }

  /** Подзаголовок блока ИИ-заключения с акцентной чертой. */
  aiBlockHeader(title: string): void {
    this.needSpace(28);
    this.page.drawText(title, {
      x: CONTENT_X,
      y: this.y - 11,
      size: 11,
      font: this.fontBold,
      color: TEXT,
    });
    this.y -= 14;
    drawFigmaSectionAccentRule(this.page, CONTENT_X, this.y, CONTENT_W);
    this.y -= 10;
  }

  heading(text: string, size = 13): void {
    this.needSpace(size + 10);
    this.page.drawText(text, {
      x: CONTENT_X,
      y: this.y - size,
      size,
      font: this.fontBold,
      color: BRAND_DEEP,
    });
    this.y -= size + 12;
  }

  textLine(text: string, size = 10, bold = false, color = TEXT): void {
    const f = bold ? this.fontBold : this.font;
    const lines = wrapLines(text, f, size, CONTENT_W);
    for (const ln of lines) {
      this.needSpace(size + 3);
      this.page.drawText(ln, {
        x: CONTENT_X,
        y: this.y - size,
        size,
        font: f,
        color,
      });
      this.y -= size + 4;
    }
  }

  paragraph(text: string, size = 10): void {
    const lines = wrapLines(text, this.font, size, CONTENT_W);
    for (const ln of lines) {
      this.needSpace(size + 3);
      this.page.drawText(ln, {
        x: CONTENT_X,
        y: this.y - size,
        size,
        font: this.font,
        color: TEXT,
      });
      this.y -= size + 4;
    }
    this.y -= 4;
  }

  spacer(pts = 8): void {
    this.y -= pts;
  }

  /**
   * Рисует «Ключ: значение» одной логической строкой: ключ жирным, значение обычным.
   * Длинное значение переносится на следующие строки с учётом ширины первой строки.
   */
  drawFlowSectionHeader(title: string): void {
    this.needSpace(30);
    this.page.drawText(title, {
      x: CONTENT_X,
      y: this.y,
      size: 10,
      font: this.fontBold,
      color: FIGMA_REPORT_BRAND,
    });
    this.y -= 14;
    drawFigmaSectionAccentRule(this.page, CONTENT_X, this.y, CONTENT_W);
    this.y -= 12;
  }

  drawFlowParagraph(
    text: string,
    size: number,
    bold: boolean,
    color: ReturnType<typeof rgb> = TEXT
  ): void {
    const f = bold ? this.fontBold : this.font;
    const lines = wrapLines(text, f, size, CONTENT_W);
    const lineH = size * 1.4;
    for (const line of lines) {
      this.needSpace(lineH);
      if (line.length === 0) {
        this.y -= lineH;
        continue;
      }
      this.page.drawText(line, {
        x: CONTENT_X,
        y: this.y - size,
        size,
        font: f,
        color,
      });
      this.y -= lineH;
    }
  }

  drawFlowGap(pt: number): void {
    this.y -= pt;
  }

  drawIndentedLines(lines: ReadonlyArray<string>): void {
    const textX = CONTENT_X + NARRATIVE_BLOCK_INDENT;
    const textW = CONTENT_W - NARRATIVE_BLOCK_INDENT;
    for (const line of lines) {
      const wrapped = wrapLines(line, this.font, NARRATIVE_BODY_SIZE, textW);
      const lineH = NARRATIVE_BODY_SIZE * 1.4;
      for (const ln of wrapped) {
        this.needSpace(lineH);
        this.page.drawText(ln, {
          x: textX,
          y: this.y - NARRATIVE_BODY_SIZE,
          size: NARRATIVE_BODY_SIZE,
          font: this.font,
          color: TEXT,
        });
        this.y -= lineH;
      }
      this.drawFlowGap(2);
    }
    this.drawFlowGap(3);
  }

  drawFlowInlineResultParagraph(prefix: string, highlight: string, suffix: string): void {
    const tokens = _buildInlineResultTokens(
      prefix,
      highlight,
      suffix,
      this.font,
      this.fontBold
    );
    const lines = _layoutStyledTokens(tokens, CONTENT_W);
    for (const line of lines) {
      const lineHeight = Math.max(...line.map((token) => token.size)) * 1.4;
      this.needSpace(lineHeight);
      let x = CONTENT_X;
      for (let index = 0; index < line.length; index += 1) {
        const token = line[index]!;
        if (index > 0) {
          const prev = line[index - 1]!;
          x += prev.font.widthOfTextAtSize(" ", prev.size);
        }
        this.page.drawText(token.word, {
          x,
          y: this.y - token.size,
          size: token.size,
          font: token.font,
          color: token.color,
        });
        x += token.font.widthOfTextAtSize(token.word, token.size);
      }
      this.y -= lineHeight;
    }
  }

  drawBoldTermDefinition(term: string, description: string): void {
    const tokens: StyledWordToken[] = [];
    _appendWords(tokens, term, this.fontBold, NARRATIVE_BODY_SIZE, TEXT);
    tokens.push({
      word: "—",
      font: this.font,
      size: NARRATIVE_BODY_SIZE,
      color: TEXT,
    });
    _appendWords(tokens, description, this.font, NARRATIVE_BODY_SIZE, TEXT);
    const lines = _layoutStyledTokens(tokens, CONTENT_W);
    for (const line of lines) {
      const lineHeight = Math.max(...line.map((token) => token.size)) * 1.4;
      this.needSpace(lineHeight);
      let x = CONTENT_X;
      for (let index = 0; index < line.length; index += 1) {
        const token = line[index]!;
        if (index > 0) {
          const prev = line[index - 1]!;
          x += prev.font.widthOfTextAtSize(" ", prev.size);
        }
        this.page.drawText(token.word, {
          x,
          y: this.y - token.size,
          size: token.size,
          font: token.font,
          color: token.color,
        });
        x += token.font.widthOfTextAtSize(token.word, token.size);
      }
      this.y -= lineHeight;
    }
  }

  drawNarrativeParagraph(rawPara: AuditReportNarrativeParagraphInput): void {
    const para = normalizeNarrativeParagraph(rawPara);
    if (para.boldTerm !== undefined) {
      this.drawBoldTermDefinition(para.boldTerm, para.termDescription ?? "");
      return;
    }
    if (para.indentedLines !== undefined && para.indentedLines.length > 0) {
      this.drawIndentedLines(para.indentedLines);
      return;
    }
    if (para.text !== undefined && para.highlight === undefined) {
      const isNumberedTrait = /^\d+\.\s/.test(para.text.trim());
      if (para.brandSubheading === true) {
        this.drawFlowParagraph(para.text, 10, true, FIGMA_REPORT_BRAND);
        this.drawFlowGap(4);
        return;
      }
      this.drawFlowParagraph(para.text, NARRATIVE_BODY_SIZE, false);
      this.drawFlowGap(isNumberedTrait ? 2 : 5);
      return;
    }
    if (para.highlight !== undefined && para.prefix === undefined && para.suffix === undefined) {
      this.drawFlowParagraph(para.highlight, NARRATIVE_HIGHLIGHT_SIZE, true, FIGMA_REPORT_BRAND);
      this.drawFlowGap(5);
      return;
    }
    if (para.highlight !== undefined) {
      this.drawFlowInlineResultParagraph(
        para.prefix ?? "",
        para.highlight,
        para.suffix ?? ""
      );
      this.drawFlowGap(5);
    }
  }

  startNarrativeSection(section: ScreeningReportNarrativeSection): void {
    this.startSectionPage(false);
    this.drawFlowSectionHeader(`${String(section.sectionIndex)}. ${section.title.toUpperCase()}`);
    this.drawFlowGap(8);
    for (const rawPara of section.paragraphs) {
      this.drawNarrativeParagraph(rawPara);
    }
  }

  drawQuestionnaireSection(step4: Step4Data): void {
    this.startSectionPage(false);
    this.drawFlowSectionHeader("1. АНКЕТНЫЕ ДАННЫЕ");
    this.drawFlowGap(6);
    const step4Sections = buildStep4ReportSections(step4);
    for (const section of step4Sections) {
      this.needSpace(28);
      const isEducationConclusion =
        section.title === "Заключение по образованию и обучению";
      this.textLine(section.title, isEducationConclusion ? 13.5 : 13, true, isEducationConclusion ? FIGMA_REPORT_BRAND : undefined);
      this.spacer(2);
      for (const r of section.rows) {
        if (isEducationConclusion) {
          this.drawFlowParagraph(r.value, 11.5, false);
          continue;
        }
        this.keyValueLine(r.key, truncate(r.value, 1200), 12);
      }
      if (section.groups) {
        for (const g of section.groups) {
          this.needSpace(24);
          this.spacer(2);
          this.textLine(g.heading, 11.5, true, TEXT_MUTED);
          for (const r of g.rows) {
            this.keyValueLine(r.key, truncate(r.value, 1200), 12);
          }
        }
      }
      this.spacer(6);
    }
    this.spacer(4);
  }

  keyValueLine(key: string, value: string, size = 12): void {
    const label = `${key}: `;
    const labelWidth = this.fontBold.widthOfTextAtSize(label, size);
    const maxWidth = CONTENT_W;
    const firstWidth = Math.max(40, maxWidth - labelWidth);

    const valueText = value.trim().length > 0 ? value : "—";
    const firstChunkLines = wrapLines(valueText, this.font, size, firstWidth);
    const firstLine = firstChunkLines[0] ?? "";
    const remainder = firstChunkLines.slice(1).join(" ");
    const restLines = remainder.length > 0 ? wrapLines(remainder, this.font, size, maxWidth) : [];

    this.needSpace(size + 4);
    this.page.drawText(label, {
      x: CONTENT_X,
      y: this.y - size,
      size,
      font: this.fontBold,
      color: TEXT,
    });
    this.page.drawText(firstLine, {
      x: CONTENT_X + labelWidth,
      y: this.y - size,
      size,
      font: this.font,
      color: TEXT,
    });
    this.y -= size + 5;

    for (const ln of restLines) {
      this.needSpace(size + 4);
      this.page.drawText(ln, {
        x: CONTENT_X,
        y: this.y - size,
        size,
        font: this.font,
        color: TEXT,
      });
      this.y -= size + 5;
    }
  }
}

function drawLikertChart(w: PdfWriter, data: Step3Data): void {
  const keys: (keyof Step3Data)[] = [
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q9",
    "q10",
  ];
  const values = keys.map((k) => {
    const a = data[k];
    return a ? likertAnswerToScore(a) : 0;
  });

  const chartW = CONTENT_W;
  const chartH = 140;
  const padL = 44;
  const padR = 24;
  const padT = 32;
  const padB = 36;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  w.needSpace(chartH + 56);
  const baseY = w.y - chartH;

  w.page.drawRectangle({
    x: CONTENT_X,
    y: baseY,
    width: chartW,
    height: chartH,
    color: CHART_FILL,
    borderColor: BORDER,
    borderWidth: 0.6,
  });

  w.page.drawText("Эмоциональный фон и ресурсность (шкала Ликерта, баллы 1–5)", {
    x: CONTENT_X + 6,
    y: baseY + chartH - 16,
    size: 9,
    font: w.fontBold,
    color: TEXT,
  });

  const ox = CONTENT_X + padL;
  const oy = baseY + padB;
  w.page.drawRectangle({
    x: ox,
    y: oy,
    width: innerW,
    height: innerH,
    borderColor: BORDER,
    borderWidth: 0.8,
  });

  for (const lvl of [1, 2, 3, 4, 5]) {
    const t = String(lvl);
    const gy = oy + ((lvl - 1) / 4) * innerH;
    w.page.drawLine({
      start: { x: ox, y: gy },
      end: { x: ox + innerW, y: gy },
      thickness: 0.4,
      color: rgb(0.93, 0.93, 0.93),
    });
    w.page.drawText(t, {
      x: CONTENT_X + 12,
      y: gy - 3,
      size: 8,
      font: w.font,
      color: TEXT_MUTED,
    });
  }

  w.page.drawText("Балл", {
    x: CONTENT_X + 8,
    y: baseY + chartH - padT - innerH / 2,
    size: 8,
    font: w.fontBold,
    color: TEXT_MUTED,
  });

  const n = values.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const x = ox + i * stepX;
    const v = values[i];
    const yy = v > 0 ? oy + ((v - 1) / 4) * innerH : oy;
    pts.push({ x, y: yy });
    w.page.drawLine({
      start: { x, y: oy },
      end: { x, y: oy + innerH },
      thickness: 0.3,
      color: rgb(0.94, 0.94, 0.94),
    });
    const xl = `П.${String(i + 1)}`;
    w.page.drawText(xl, {
      x: x - w.font.widthOfTextAtSize(xl, 7) / 2,
      y: oy - 18,
      size: 7,
      font: w.font,
      color: TEXT_MUTED,
    });
  }

  for (let i = 0; i < pts.length - 1; i += 1) {
    w.page.drawLine({
      start: pts[i],
      end: pts[i + 1],
      thickness: 2,
      color: FIGMA_REPORT_BRAND,
    });
  }
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    if (values[i] > 0) {
      w.page.drawCircle({
        x: p.x,
        y: p.y,
        size: 8,
        borderColor: TEXT,
        borderWidth: 0.8,
        color: HIGHLIGHT,
      });
    }
  }

  w.y = baseY - 16;
}

/** Публичный API: единый PDF вместо Word, кириллица и фирменный макет. */
export async function generateScreeningPdfBuffer(input: ScreeningPdfInput): Promise<Buffer> {
  const fontsDir = resolveReportFontsDir();
  const regularFile = path.join(fontsDir, "NotoSans-Regular.ttf");
  const boldFile = path.join(fontsDir, "NotoSans-Bold.ttf");

  const doc = await PDFDocument.create();
  /**
   * pdf-lib умеет встраивать кастомные TTF/OTF только через fontkit; без registerFontkit
   * вызов doc.embedFont(bytes) падает и весь отчёт не собирается (PDF не прикрепляется к письму).
   */
  doc.registerFontkit(fontkit);
  const fontBytes = readFileSync(regularFile);
  const fontBoldBytes = readFileSync(boldFile);
  const font = await embedCyrillicFont(doc, fontBytes);
  const fontBold = await embedCyrillicFont(doc, fontBoldBytes);
  const background = await doc.embedPng(readFigmaBackgroundBytes());
  const brand = await loadReportBrandPdfStamp(doc);

  const w = new PdfWriter(doc, font, fontBold, background, brand);
  w.addPage(false, true);

  w.coverSectionHeader("КАНДИДАТ");
  w.textLine(truncate(input.profileName, 120).toUpperCase(), 12, true);
  w.textLine(`Идентификатор сессии: ${input.sessionId}`, 9, false, TEXT_MUTED);
  w.spacer(12);
  w.drawFlowParagraph(
    "Отчёт содержит анкетные данные, три методики (КОТ, мотивация, эмоциональный фон) и итоговое заключение.",
    9,
    false,
    TEXT_MUTED
  );

  w.drawQuestionnaireSection(input.step4);

  const narrativeSections = buildScreeningNarrativeSections({
    kotIp: input.kotIp,
    maxScore: input.maxScore,
    kotIpLevelLabel: input.kotIpLevelLabel,
    step2: input.step2,
    step3: input.step3,
  });
  for (const section of narrativeSections) {
    w.startNarrativeSection(section);
    if (section.sectionIndex === 4) {
      drawLikertChart(w, input.step3);
    }
  }

  w.startSectionPage(true);
  w.drawFlowSectionHeader("5. ЗАКЛЮЧЕНИЕ");
  w.drawFlowGap(8);
  const aiText = buildScreeningAiConclusionText(input.conclusionText, input.hiringRecommendations);
  for (const line of aiText.split(/\r?\n/)) {
    const t = line.trimEnd();
    if (t === "") {
      w.spacer(6);
      continue;
    }
    if (isScreeningConclusionSectionHeader(t)) {
      w.aiBlockHeader(t);
      continue;
    }
    w.textLine(t, 10, false);
  }
  w.spacer(4);
  w.drawFlowParagraph(AI_REPORT_DISCLAIMER, 8, false, TEXT_MUTED);

  finalizeFigmaPageNumbers(doc, fontBold);

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await doc.save();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF: doc.save — ${m}`);
  }
  return Buffer.from(pdfBytes);
}
