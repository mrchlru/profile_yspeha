import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";

import {
  NARRATIVE_BURNOUT_RESULTS_HEADING,
  NARRATIVE_KOS_RESULTS_HEADING,
} from "@/lib/audit/report/auditNarrativeReference";
import {
  normalizeNarrativeParagraph,
  type AuditReportNarrativeParagraphInput,
} from "@/lib/audit/report/auditNarrativeParagraph";
import type {
  AuditReportBurnoutNormTable,
  AuditReportKosReferenceTable,
} from "@/lib/audit/report/auditReportTypes";
import {
  GERCHIKOV_CONCLUSION_STIMULATION_ROW_LABELS,
  GERCHIKOV_CONCLUSION_WORK_ROW_LABELS,
} from "@/lib/audit/report/keys/auditScoringKeys";
import type {
  AuditConclusionData,
  AuditConclusionMotivationType,
  AuditReportAiStructured,
  AuditReportJson,
  AuditReportManagerLine,
  AuditReportManagerTrafficLight,
  AuditReportNarrativeSection,
} from "@/lib/audit/report/auditReportTypes";
import { AUDIT_PDF_H, AUDIT_PDF_W } from "@/lib/report/auditPdfLayout";
import {
  AI_REPORT_DISCLAIMER,
  drawFigmaSectionAccentRule,
} from "@/lib/report/reportAiSectionLayout";
import {
  applyFigmaPageBackgroundWithBrand,
  AUDIT_COVER_DECOR,
  drawFigmaCoverDecor,
  embedCyrillicFont,
  FIGMA_CONTENT_BOTTOM,
  FIGMA_FLOW_TEXT_W,
  FIGMA_FLOW_TEXT_X,
  FIGMA_FLOW_TOP,
  FIGMA_REPORT_BRAND,
  FIGMA_REPORT_CAUTION,
  FIGMA_REPORT_DANGER,
  FIGMA_REPORT_SUCCESS,
  FIGMA_REPORT_TEXT,
  FIGMA_REPORT_TEXT_MUTED,
  FIGMA_REPORT_WARNING,
  finalizeFigmaPageNumbers,
  readFigmaBackgroundBytes,
  resolveReportFontsDir,
} from "@/lib/report/figmaReportPdfShell";
import {
  loadReportBrandPdfStamp,
  type ReportBrandPdfStamp,
} from "@/lib/report/reportBrandPdf";
import { readFileSync } from "fs";
import path from "path";

/** Максимум страниц для блока «Отчёт для руководителя». */
const MANAGER_REPORT_MAX_PAGES = 3;

const NARRATIVE_BODY_SIZE = 9.5;
const NARRATIVE_HIGHLIGHT_SIZE = 12;
const NARRATIVE_HIGHLIGHT_INLINE_SIZE = 11;
/** Абзацный отступ для блока пар качеств Кейрси (как в референсном отчёте). */
const NARRATIVE_BLOCK_INDENT = 42;

export type AuditPdfInput = {
  fullName: string;
  sessionId: string;
  report: AuditReportJson;
};

/**
 * Формирует многостраничный PDF отчёта аудита: обложка, блоки по методикам, ИИ в конце.
 */
export async function generateAuditPdfBuffer(input: AuditPdfInput): Promise<Buffer> {
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

  const w = new AuditFigmaPdfWriter(doc, font, fontBold, background, brand);
  w.renderReport(input);
  finalizeFigmaPageNumbers(doc, fontBold);

  return Buffer.from(await doc.save());
}

/**
 * PDF только с блоком «Отчёт для руководителя» (без полного отчёта HrD).
 */
export async function generateAuditManagerPdfBuffer(input: AuditPdfInput): Promise<Buffer> {
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

  const w = new AuditFigmaPdfWriter(doc, font, fontBold, background, brand);
  w.renderManagerOnlyReport(input);
  finalizeFigmaPageNumbers(doc, fontBold);

  return Buffer.from(await doc.save());
}

class AuditFigmaPdfWriter {
  readonly doc: PDFDocument;
  readonly font: PDFFont;
  readonly fontBold: PDFFont;
  readonly background: PDFImage;
  readonly brand: ReportBrandPdfStamp | null;
  page!: PDFPage;
  pageNum = 0;
  cursorY = 0;
  /** Следующая строка таблицы примыкает к предыдущей (без зазора и наложения). */
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

  renderReport(input: AuditPdfInput): void {
    this.startCoverPage();
    drawFigmaCoverDecor(this.page, this.fontBold, AUDIT_COVER_DECOR);
    this.drawFlowSectionHeader("УЧАСТНИК");
    this.drawFlowParagraph(`${input.fullName.toUpperCase()}`, 12, true);
    this.drawFlowGap(6);
    this.drawFlowParagraph(`Session ID: ${input.sessionId}`, 8, false, FIGMA_REPORT_TEXT_MUTED);
    this.drawFlowParagraph(`Отчёт сформирован: ${input.report.generatedAt}`, 8, false, FIGMA_REPORT_TEXT_MUTED);
    this.drawFlowGap(12);
    const narrativeSections = _resolveNarrativeSections(input.report);
    this.drawFlowParagraph(
      `Отчёт содержит ${String(narrativeSections.length)} разделов по методикам и итоговое заключение.`,
      9,
      false,
      FIGMA_REPORT_TEXT_MUTED
    );

    for (const section of narrativeSections) {
      this.startNarrativeSection(section);
    }

    this.startFinalPage("15. ЗАКЛЮЧЕНИЕ");
    this.drawAuditConclusion(input.report.conclusion, input.report.ai.structured);

    const yoyLines = buildBriefYoyLines(input.report);
    if (yoyLines.length > 0) {
      this.ensureSpace(36);
      this.drawFlowGap(10);
      this.drawFlowSectionHeader("ДИНАМИКА ГОД К ГОДУ");
      for (const line of yoyLines) {
        this.drawFlowParagraph(line, 9, false);
      }
    }

    this.renderManagerBrief(input.report.managerBrief);
  }

  /** Отдельный PDF: обложка + блок для руководителя. */
  renderManagerOnlyReport(input: AuditPdfInput): void {
    this.startCoverPage();
    drawFigmaCoverDecor(this.page, this.fontBold, AUDIT_COVER_DECOR);
    this.drawFlowSectionHeader("ОТЧЁТ ДЛЯ РУКОВОДИТЕЛЯ");
    this.drawFlowParagraph(`${input.fullName.toUpperCase()}`, 12, true);
    this.drawFlowGap(6);
    this.drawFlowParagraph(`Session ID: ${input.sessionId}`, 8, false, FIGMA_REPORT_TEXT_MUTED);
    this.drawFlowParagraph(
      `Отчёт сформирован: ${input.report.generatedAt}`,
      8,
      false,
      FIGMA_REPORT_TEXT_MUTED
    );
    this.drawFlowGap(12);
    const maxPage = this.pageNum + MANAGER_REPORT_MAX_PAGES - 1;
    this.renderManagerBriefContent(input.report.managerBrief, maxPage);
  }

  /** Последний блок полного PDF: краткие выводы по методикам + заключение (≤3 стр.). */
  renderManagerBrief(brief: AuditReportJson["managerBrief"]): void {
    this.startFinalPage("ОТЧЁТ ДЛЯ РУКОВОДИТЕЛЯ");
    const maxPage = this.pageNum + MANAGER_REPORT_MAX_PAGES - 1;
    this.renderManagerBriefContent(brief, maxPage);
  }

  renderManagerBriefContent(brief: AuditReportJson["managerBrief"], maxPage: number): void {
    for (const line of brief.testLines) {
      if (this.pageNum > maxPage) {
        break;
      }
      this.drawManagerTestRow(line, maxPage);
    }

    if (this.pageNum <= maxPage) {
      this.drawFlowGap(10);
      this.drawFlowAiBlockHeader("ЗАКЛЮЧЕНИЕ", maxPage);
      const conclusion =
        brief.aiConclusion ??
        "Не сгенерировано (нет ключа OpenAI или ошибка модели).";
      this.drawManagerConclusion(conclusion, maxPage);
    }
  }

  drawManagerTestRow(line: AuditReportManagerLine, maxPage: number): void {
    const {
      blockIndex: index,
      title,
      briefAnswer: answer,
      danger = false,
      alertHeadline,
      alertFootnote,
      maslachBrief,
    } = line;
    const label = `${String(index)}. ${title}`;
    const lineH = 8 * 1.35;
    this.ensureSpace(lineH + 2, maxPage);
    if (this.pageNum > maxPage) {
      return;
    }
    this.page.drawText(label, {
      x: FIGMA_FLOW_TEXT_X,
      y: this.cursorY,
      size: 8,
      font: this.fontBold,
      color: danger ? FIGMA_REPORT_DANGER : FIGMA_REPORT_TEXT,
    });
    this.cursorY -= lineH;
    if (alertHeadline !== undefined && alertHeadline.trim().length > 0) {
      this.ensureSpace(lineH, maxPage);
      if (this.pageNum > maxPage) {
        return;
      }
      this.page.drawText(alertHeadline, {
        x: FIGMA_FLOW_TEXT_X,
        y: this.cursorY,
        size: 8,
        font: this.fontBold,
        color: FIGMA_REPORT_DANGER,
      });
      this.cursorY -= lineH;
    }
    if (alertFootnote !== undefined && alertFootnote.trim().length > 0) {
      this.drawFlowParagraph(alertFootnote, 7, false, FIGMA_REPORT_TEXT, maxPage);
    } else if (maslachBrief !== undefined) {
      this._drawManagerMaslachBrief(maslachBrief, maxPage);
    } else if (answer.trim().length > 0) {
      this.drawFlowParagraph(
        answer,
        8,
        false,
        danger ? FIGMA_REPORT_DANGER : FIGMA_REPORT_TEXT_MUTED,
        maxPage
      );
    }
    this.drawFlowGap(3, maxPage);
  }

  _drawManagerMaslachBrief(
    brief: NonNullable<AuditReportManagerLine["maslachBrief"]>,
    maxPage: number
  ): void {
    const overallColor = _managerTrafficLightColor(brief.overallTrafficLight);
    this.drawFlowParagraph(brief.overallTitle, 8, true, overallColor, maxPage);
    this.drawFlowParagraph(brief.overallText, 8, false, overallColor, maxPage);
    this.drawFlowGap(4, maxPage);
    for (const scale of brief.scales) {
      const color = _managerTrafficLightColor(scale.trafficLight);
      this.drawFlowParagraph(scale.scaleTitle, 8, true, color, maxPage);
      this.drawFlowParagraph(scale.whatItMeasures, 7, false, FIGMA_REPORT_TEXT_MUTED, maxPage);
      this.drawFlowParagraph(scale.statusLabel, 8, true, color, maxPage);
      this.drawFlowParagraph(scale.managerMeaning, 8, false, color, maxPage);
      this.drawFlowGap(3, maxPage);
    }
  }

  drawManagerConclusion(text: string, maxPage: number): void {
    const paragraphs = text.split(/\n+/).map((part) => part.trim()).filter((part) => part.length > 0);
    const blocks = paragraphs.length > 0 ? paragraphs : [text.trim()];

    for (let p = 0; p < blocks.length; p += 1) {
      if (p > 0) {
        this.drawFlowGap(6, maxPage);
      }
      const lines = wrapLines(blocks[p]!, this.font, 9, FIGMA_FLOW_TEXT_W);
      const lineH = 9 * 1.35;
      for (const line of lines) {
        if (this.pageNum > maxPage) {
          break;
        }
        this.ensureSpace(lineH, maxPage);
        if (this.pageNum > maxPage) {
          break;
        }
        if (line.length === 0) {
          this.cursorY -= lineH;
          continue;
        }
        this.page.drawText(line, {
          x: FIGMA_FLOW_TEXT_X,
          y: this.cursorY,
          size: 9,
          font: this.font,
          color: FIGMA_REPORT_TEXT,
        });
        this.cursorY -= lineH;
      }
    }
  }

  startCoverPage(): void {
    this.page = this.doc.addPage([AUDIT_PDF_W, AUDIT_PDF_H]);
    this.pageNum = 1;
    applyFigmaPageBackgroundWithBrand(this.page, this.background, this.brand);
    this.cursorY = FIGMA_FLOW_TOP;
  }

  /** Секция нарративного отчёта: заголовок + связный текст (без сырых баллов). */
  startNarrativeSection(section: AuditReportNarrativeSection): void {
    this.addContinuationPage();
    this.drawFlowSectionHeader(
      `${String(section.sectionIndex)}. ${section.title.toUpperCase()}`
    );
    this.drawFlowGap(8);
    let kosTablesDrawn = false;
    let burnoutTablesDrawn = false;
    for (const rawPara of section.paragraphs) {
      const para = normalizeNarrativeParagraph(rawPara);
      if (
        section.kosTables !== undefined &&
        section.kosTables.length > 0 &&
        !kosTablesDrawn &&
        para.brandSubheading === true &&
        para.text === NARRATIVE_KOS_RESULTS_HEADING
      ) {
        for (const table of section.kosTables) {
          this.drawKosReferenceTable(table);
        }
        kosTablesDrawn = true;
      }
      if (
        section.burnoutTables !== undefined &&
        section.burnoutTables.length > 0 &&
        !burnoutTablesDrawn &&
        para.brandSubheading === true &&
        para.text === NARRATIVE_BURNOUT_RESULTS_HEADING
      ) {
        for (const table of section.burnoutTables) {
          this.drawBurnoutNormTable(table);
        }
        burnoutTablesDrawn = true;
      }
      this.drawNarrativeParagraph(rawPara);
    }
  }

  /** Рисует один абзац нарративной секции с выделением ключевого результата. */
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
      this.drawFlowParagraph(
        para.highlight,
        NARRATIVE_HIGHLIGHT_SIZE,
        true,
        para.highlightDanger === true ? FIGMA_REPORT_DANGER : FIGMA_REPORT_BRAND
      );
      this.drawFlowGap(5);
      return;
    }
    if (para.highlight !== undefined) {
      this.drawFlowInlineResultParagraph(
        para.prefix ?? "",
        para.highlight,
        para.suffix ?? "",
        para.highlightDanger === true
      );
      this.drawFlowGap(5);
    }
  }

  /**
   * Строка с выделенным фрагментом: префикс и суффикс — обычным текстом,
   * результат — жирным акцентным цветом (чуть крупнее).
   */
  drawFlowInlineResultParagraph(
    prefix: string,
    highlight: string,
    suffix: string,
    danger = false
  ): void {
    const tokens = _buildInlineResultTokens(
      prefix,
      highlight,
      suffix,
      this.font,
      this.fontBold,
      danger ? FIGMA_REPORT_DANGER : FIGMA_REPORT_BRAND
    );
    const lines = _layoutStyledTokens(tokens, FIGMA_FLOW_TEXT_W);
    for (const line of lines) {
      const lineHeight = Math.max(...line.map((token) => token.size)) * 1.4;
      this.ensureSpace(lineHeight);
      let x = FIGMA_FLOW_TEXT_X;
      for (let index = 0; index < line.length; index += 1) {
        const token = line[index]!;
        if (index > 0) {
          const prev = line[index - 1]!;
          const spaceWidth = prev.font.widthOfTextAtSize(" ", prev.size);
          x += spaceWidth;
        }
        this.page.drawText(token.word, {
          x,
          y: this.cursorY,
          size: token.size,
          font: token.font,
          color: token.color,
        });
        x += token.font.widthOfTextAtSize(token.word, token.size);
      }
      this.cursorY -= lineHeight;
    }
  }

  startFinalPage(title: string): void {
    this.addContinuationPage();
    this.drawFlowSectionHeader(title);
  }

  addContinuationPage(): void {
    this.page = this.doc.addPage([AUDIT_PDF_W, AUDIT_PDF_H]);
    this.pageNum += 1;
    applyFigmaPageBackgroundWithBrand(this.page, this.background, this.brand);
    this.cursorY = FIGMA_FLOW_TOP;
  }

  drawFlowSectionHeader(title: string): void {
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

  /**
   * Итоговое заключение в стиле референсного кадрового отчёта:
   * интеллект → мотивационный тип с таблицами → психотип → выводы по методикам → риски.
   */
  drawAuditConclusion(
    conclusion: AuditConclusionData,
    structured: AuditReportAiStructured | null
  ): void {
    this.drawFlowAiBlockHeader("УРОВЕНЬ ИНТЕЛЛЕКТА");
    this.drawFlowParagraph(conclusion.intelligence.statement, 9.5, false);
    if (structured !== null && structured.intelligenceVerdict.trim().length > 0) {
      this.drawFlowGap(4);
      this.drawFlowParagraph(structured.intelligenceVerdict.trim(), 9.5, false);
    }
    this.drawFlowGap(10);

    this.drawFlowAiBlockHeader("МОТИВАЦИОННЫЙ ТИП");
    if (structured !== null && structured.motivationCommentary.trim().length > 0) {
      this.drawFlowParagraph(structured.motivationCommentary.trim(), 9.5, false);
      this.drawFlowGap(6);
    }
    if (conclusion.motivationTypes.length === 0) {
      this.drawFlowParagraph(
        "Данных опросника мотивации недостаточно для определения типа.",
        9.5,
        false
      );
    }
    for (const type of conclusion.motivationTypes) {
      this.drawMotivationType(type);
    }
    this.drawFlowGap(6);

    if (structured !== null && structured.psychotypeRealization.trim().length > 0) {
      this.drawFlowAiBlockHeader("РЕАЛИЗАЦИЯ ПСИХОТИПА");
      this.drawFlowParagraph(structured.psychotypeRealization.trim(), 9.5, false);
      this.drawFlowGap(10);
    }

    const insights =
      structured !== null
        ? structured.methodologyInsights.map((s) => s.trim()).filter((s) => s.length > 0)
        : [];
    if (insights.length > 0) {
      this.drawFlowAiBlockHeader("ВЫВОДЫ ПО МЕТОДИКАМ");
      insights.forEach((insight, i) => {
        this.drawFlowParagraph(`${String(i + 1)}. ${insight}`, 9.5, false);
        this.drawFlowGap(3);
      });
      this.drawFlowGap(8);
    }

    if (structured !== null && structured.risksAndAdditional.trim().length > 0) {
      this.drawFlowAiBlockHeader("РИСКИ И ДОПОЛНИТЕЛЬНЫЕ ХАРАКТЕРИСТИКИ");
      this.drawFlowParagraph(structured.risksAndAdditional.trim(), 9.5, false);
      this.drawFlowGap(8);
    }

    if (structured === null) {
      this.drawFlowParagraph(
        "Связное заключение ИИ не сформировано (нет ключа OpenAI или ошибка модели); приведены детерминированные результаты.",
        8,
        false,
        FIGMA_REPORT_TEXT_MUTED
      );
    }

    this.drawFlowGap(4);
    this.drawFlowParagraph(AI_REPORT_DISCLAIMER, 8, false, FIGMA_REPORT_TEXT_MUTED);
  }

  /** Один ведущий тип мотивации: заголовок, описание и две таблицы. */
  drawMotivationType(type: AuditConclusionMotivationType): void {
    this.ensureSpace(40);
    this.drawFlowParagraph(
      `Тип ${String(type.order)}. ${type.typeLabel} мотивационный тип`,
      10,
      true,
      FIGMA_REPORT_BRAND
    );
    this.drawFlowGap(2);
    this.drawFlowParagraph(`Описание: ${type.description}`, 9.5, false);
    this.drawFlowGap(6);

    this.drawTwoColTable("Меры стимулирования", "Параметр", "Значение", [
      {
        key: GERCHIKOV_CONCLUSION_STIMULATION_ROW_LABELS.base,
        value: joinOrDash(type.stimulation.base),
      },
      {
        key: GERCHIKOV_CONCLUSION_STIMULATION_ROW_LABELS.applicable,
        value: joinOrDash(type.stimulation.applicable),
      },
      {
        key: GERCHIKOV_CONCLUSION_STIMULATION_ROW_LABELS.forbidden,
        value: joinOrDash(type.stimulation.forbidden),
      },
    ]);
    this.drawFlowGap(6);

    this.drawTwoColTable("Ожидаемое трудовое поведение", "Показатель", "Характеристика", [
      {
        key: GERCHIKOV_CONCLUSION_WORK_ROW_LABELS.discipline,
        value: type.workBehavior.discipline,
      },
      {
        key: GERCHIKOV_CONCLUSION_WORK_ROW_LABELS.initiative,
        value: type.workBehavior.initiative,
      },
      {
        key: GERCHIKOV_CONCLUSION_WORK_ROW_LABELS.functionality,
        value: type.workBehavior.functionality,
      },
      {
        key: GERCHIKOV_CONCLUSION_WORK_ROW_LABELS.learning,
        value: type.workBehavior.learning,
      },
    ]);
    this.drawFlowGap(10);
  }

  /** Определение термина: жирное название и пояснение (как в референсе выгорания). */
  drawBoldTermDefinition(term: string, description: string): void {
    const tokens: StyledWordToken[] = [];
    _appendWords(tokens, term, this.fontBold, NARRATIVE_BODY_SIZE, FIGMA_REPORT_TEXT);
    tokens.push({
      word: "—",
      font: this.font,
      size: NARRATIVE_BODY_SIZE,
      color: FIGMA_REPORT_TEXT,
    });
    _appendWords(tokens, description, this.font, NARRATIVE_BODY_SIZE, FIGMA_REPORT_TEXT);
    const lines = _layoutStyledTokens(tokens, FIGMA_FLOW_TEXT_W);
    for (const line of lines) {
      const lineHeight = Math.max(...line.map((token) => token.size)) * 1.4;
      this.ensureSpace(lineHeight);
      let x = FIGMA_FLOW_TEXT_X;
      for (let index = 0; index < line.length; index += 1) {
        const token = line[index]!;
        if (index > 0) {
          const prev = line[index - 1]!;
          x += prev.font.widthOfTextAtSize(" ", prev.size);
        }
        this.page.drawText(token.word, {
          x,
          y: this.cursorY,
          size: token.size,
          font: token.font,
          color: token.color,
        });
        x += token.font.widthOfTextAtSize(token.word, token.size);
      }
      this.cursorY -= lineHeight;
    }
    this.drawFlowGap(5);
  }

  /** Нормативная таблица выгорания: подзаголовок + 5 колонок (как в референсе). */
  drawBurnoutNormTable(table: AuditReportBurnoutNormTable): void {
    this.drawFlowTableSubheader(table.title);
    const colWidth = FIGMA_FLOW_TEXT_W / 5;
    const colWidths = Array.from({ length: 5 }, () => colWidth);
    this._beginTableStack();
    this.drawMultiColTableRow(table.headers, colWidths, true);
    this.drawMultiColTableRow(table.ranges, colWidths, false);
    this._endTableStack(8);
  }

  /** Справочная таблица КОС: подзаголовок + 3 колонки (как в референсном отчёте). */
  drawKosReferenceTable(table: AuditReportKosReferenceTable): void {
    this.drawFlowTableSubheader(table.title);
    this.drawThreeColTable(
      ["Уровень", "Оценка", "Показатель"],
      table.rows.map((row) => [row.level, row.grade, row.indicator])
    );
    this.drawFlowGap(8);
  }

  /** Подзаголовок таблицы — акцентный цвет и короткое подчёркивание. */
  drawFlowTableSubheader(title: string): void {
    this.ensureSpace(24);
    this.page.drawText(title, {
      x: FIGMA_FLOW_TEXT_X,
      y: this.cursorY,
      size: 9.5,
      font: this.fontBold,
      color: FIGMA_REPORT_BRAND,
    });
    this.cursorY -= 12;
    drawFigmaSectionAccentRule(
      this.page,
      FIGMA_FLOW_TEXT_X,
      this.cursorY,
      FIGMA_FLOW_TEXT_W * 0.42
    );
    this.cursorY -= 10;
  }

  /** Трёхколоночная таблица с рамками. */
  drawThreeColTable(
    headers: ReadonlyArray<string>,
    rows: ReadonlyArray<ReadonlyArray<string>>
  ): void {
    const colWidths = [
      FIGMA_FLOW_TEXT_W * 0.34,
      FIGMA_FLOW_TEXT_W * 0.12,
      FIGMA_FLOW_TEXT_W * 0.54,
    ];
    this._beginTableStack();
    this.drawMultiColTableRow(headers, colWidths, true);
    for (const row of rows) {
      this.drawMultiColTableRow(row, colWidths, false);
    }
    this._endTableStack(4);
  }

  drawMultiColTableRow(
    cells: ReadonlyArray<string>,
    colWidths: ReadonlyArray<number>,
    header: boolean
  ): void {
    const tableX = FIGMA_FLOW_TEXT_X;
    const tableW = FIGMA_FLOW_TEXT_W;
    const padX = 5;
    const padY = 4;
    const size = 8.5;
    const lineH = size * 1.32;
    const cellFont = header ? this.fontBold : this.font;

    const cellLineGroups = cells.map((cell, index) => {
      const colW = colWidths[index] ?? tableW / cells.length;
      return wrapLines(cell, cellFont, size, colW - padX * 2);
    });
    const rowLines = Math.max(...cellLineGroups.map((lines) => lines.length), 1);
    const rowH = rowLines * lineH + padY * 2;

    this.ensureSpace(rowH);

    const top = this._tableRowTop(size);
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

    let colX = tableX;
    for (let colIndex = 0; colIndex < cells.length; colIndex += 1) {
      if (colIndex > 0) {
        this.page.drawLine({
          start: { x: colX, y: top },
          end: { x: colX, y: bottom },
          thickness: 0.6,
          color: borderColor,
        });
      }
      const colW = colWidths[colIndex] ?? 0;
      const lines = cellLineGroups[colIndex] ?? [];
      let ty = top - padY - size;
      for (const line of lines) {
        this.page.drawText(line, {
          x: colX + padX,
          y: ty,
          size,
          font: cellFont,
          color: FIGMA_REPORT_TEXT,
        });
        ty -= lineH;
      }
      colX += colW;
    }

    this.cursorY = bottom;
    this.tableStackActive = true;
  }

  /** Двухколоночная таблица с рамками (заголовок + шапка + строки), переносится по строкам. */
  drawTwoColTable(
    caption: string,
    col1Header: string,
    col2Header: string,
    rows: ReadonlyArray<{ key: string; value: string }>
  ): void {
    this.ensureSpace(14);
    this.drawFlowParagraph(caption, 9, true);
    this.drawFlowGap(2);
    this._beginTableStack();
    this.drawTableRow(col1Header, col2Header, true);
    for (const row of rows) {
      this.drawTableRow(row.key, row.value, false);
    }
    this._endTableStack(4);
  }

  /** Верхняя граница очередной строки таблицы (стыкуется с предыдущей без зазора). */
  _tableRowTop(fontSize: number): number {
    if (this.tableStackActive) {
      return this.cursorY;
    }
    return this.cursorY + fontSize;
  }

  _beginTableStack(): void {
    this.tableStackActive = false;
  }

  _endTableStack(gapAfter: number): void {
    this.tableStackActive = false;
    this.drawFlowGap(gapAfter);
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

    const top = this._tableRowTop(size);
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

  drawFlowAiBlockHeader(title: string, maxPage?: number): void {
    this.ensureSpace(32, maxPage);
    if (maxPage !== undefined && this.pageNum > maxPage) {
      return;
    }
    this.page.drawText(title, {
      x: FIGMA_FLOW_TEXT_X,
      y: this.cursorY,
      size: 11,
      font: this.fontBold,
      color: FIGMA_REPORT_TEXT,
    });
    this.cursorY -= 14;
    drawFigmaSectionAccentRule(this.page, FIGMA_FLOW_TEXT_X, this.cursorY, FIGMA_FLOW_TEXT_W);
    this.cursorY -= 12;
  }

  drawFlowNumberedSection(index: number, title: string): void {
    this.ensureSpace(20);
    this.page.drawText(`${String(index)}. ${title}`, {
      x: FIGMA_FLOW_TEXT_X,
      y: this.cursorY,
      size: 9.5,
      font: this.fontBold,
      color: FIGMA_REPORT_TEXT,
    });
    this.cursorY -= 14;
  }

  /** Блок строк с абзацным отступом (пары качеств Кейрси и аналоги). */
  drawIndentedLines(lines: ReadonlyArray<string>): void {
    const textX = FIGMA_FLOW_TEXT_X + NARRATIVE_BLOCK_INDENT;
    const textW = FIGMA_FLOW_TEXT_W - NARRATIVE_BLOCK_INDENT;
    for (const line of lines) {
      this.drawFlowParagraph(
        line,
        NARRATIVE_BODY_SIZE,
        false,
        FIGMA_REPORT_TEXT,
        undefined,
        textX,
        textW
      );
      this.drawFlowGap(2);
    }
    this.drawFlowGap(3);
  }

  drawFlowParagraph(
    text: string,
    size: number,
    bold: boolean,
    color: ReturnType<typeof rgb> = FIGMA_REPORT_TEXT,
    maxPage?: number,
    textX: number = FIGMA_FLOW_TEXT_X,
    textW: number = FIGMA_FLOW_TEXT_W
  ): void {
    const f = bold ? this.fontBold : this.font;
    const lines = wrapLines(text, f, size, textW);
    const lineH = size * 1.4;
    for (const line of lines) {
      this.ensureSpace(lineH, maxPage);
      if (maxPage !== undefined && this.pageNum > maxPage) {
        return;
      }
      if (line.length === 0) {
        this.cursorY -= lineH;
        continue;
      }
      this.page.drawText(line, {
        x: textX,
        y: this.cursorY,
        size,
        font: f,
        color,
      });
      this.cursorY -= lineH;
    }
  }

  drawFlowGap(pt: number, maxPage?: number): void {
    if (maxPage !== undefined && this.pageNum > maxPage) {
      return;
    }
    this.cursorY -= pt;
  }

  ensureSpace(minHeight: number, maxPage?: number): void {
    if (this.cursorY - minHeight >= FIGMA_CONTENT_BOTTOM) {
      return;
    }
    if (maxPage !== undefined && this.pageNum >= maxPage) {
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

/** Совместимость со старыми JSON-отчётами без narrativeSections. */
function _resolveNarrativeSections(report: AuditReportJson): ReadonlyArray<AuditReportNarrativeSection> {
  if (report.narrativeSections !== undefined && report.narrativeSections.length > 0) {
    return report.narrativeSections;
  }
  return report.testBlocks.map((block, index) => ({
    sectionIndex: index + 1,
    title: block.title,
    paragraphs: [
      ...block.aboutParagraphs,
      ...block.conclusionParagraphs,
    ].filter((p) => p.trim().length > 0),
  }));
}

function joinOrDash(items: ReadonlyArray<string>): string {
  return items.length > 0 ? items.join("; ") : "—";
}

function buildBriefYoyLines(report: AuditReportJson): string[] {
  if (report.yoy === null || report.yoy.deltas.length === 0) {
    return report.ai.yearOverYearDynamics
      ? [report.ai.yearOverYearDynamics]
      : ["Нет предыдущего прохождения для сравнения."];
  }
  const lines: string[] = [];
  for (const d of report.yoy.deltas) {
    if (d.delta === null || d.delta === 0) {
      continue;
    }
    const sign = d.delta > 0 ? "+" : "";
    lines.push(`${d.label}: ${sign}${String(d.delta)} (было ${String(d.before ?? "—")} → ${String(d.after)})`);
  }
  if (lines.length === 0) {
    lines.push("Ключевые метрики без существенных изменений относительно прошлой волны.");
  }
  if (report.ai.yearOverYearDynamics && report.ai.yearOverYearDynamics.trim().length > 0) {
    lines.push(report.ai.yearOverYearDynamics);
  }
  return lines;
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
  boldFont: PDFFont,
  highlightColor: ReturnType<typeof rgb> = FIGMA_REPORT_BRAND
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
    highlightColor
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
    const spaceWidth = line.length > 0 ? line[line.length - 1]!.font.widthOfTextAtSize(" ", line[line.length - 1]!.size) : 0;
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

function wrapLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  const paragraphs = normalized.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
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

function _managerTrafficLightColor(light: AuditReportManagerTrafficLight): ReturnType<typeof rgb> {
  switch (light) {
    case "green":
      return FIGMA_REPORT_SUCCESS;
    case "yellow":
      return FIGMA_REPORT_WARNING;
    case "orange":
      return FIGMA_REPORT_CAUTION;
    case "red":
      return FIGMA_REPORT_DANGER;
    default:
      return FIGMA_REPORT_TEXT;
  }
}
