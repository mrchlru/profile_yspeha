import { existsSync, readFileSync } from "fs";
import path from "path";
import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";

import {
  AUDIT_BACKGROUND_REL,
  AUDIT_BRAND_RGB,
  AUDIT_CONTENT_W,
  AUDIT_CONTENT_X,
  AUDIT_LAYOUT,
  AUDIT_PDF_H,
  AUDIT_PDF_W,
  formatAuditPdfPageLabel,
} from "@/lib/report/auditPdfLayout";
import { drawFigmaSectionAccentRule } from "@/lib/report/reportAiSectionLayout";
import type { ReportBrandLogoSurface } from "@/lib/report/reportBrandConfig";
import {
  stampReportBrandOnPdfPage,
  type ReportBrandPdfStamp,
} from "@/lib/report/reportBrandPdf";

/** Текст и акценты макета Figma. */
export const FIGMA_REPORT_TEXT = rgb(0.12, 0.12, 0.12);
export const FIGMA_REPORT_TEXT_MUTED = rgb(0.45, 0.45, 0.45);
export const FIGMA_REPORT_BRAND = rgb(
  AUDIT_BRAND_RGB.r,
  AUDIT_BRAND_RGB.g,
  AUDIT_BRAND_RGB.b
);
/** Критические значения (высокое ПИ и т.п.) — красный акцент в PDF. */
export const FIGMA_REPORT_DANGER = rgb(0.78, 0.12, 0.12);
export const FIGMA_REPORT_SUCCESS = rgb(0.08, 0.52, 0.35);
export const FIGMA_REPORT_WARNING = rgb(0.72, 0.52, 0.06);
export const FIGMA_REPORT_CAUTION = rgb(0.86, 0.42, 0.08);
export const FIGMA_REPORT_WHITE = rgb(1, 1, 1);

export const FIGMA_FLOW_TEXT_X = AUDIT_CONTENT_X + 16;
export const FIGMA_FLOW_TEXT_W = AUDIT_CONTENT_W - 32;
export const FIGMA_FLOW_TOP = AUDIT_PDF_H - 248;
export const FIGMA_CONTENT_BOTTOM = AUDIT_LAYOUT.contentBottom;

export type FigmaCoverDecorConfig = {
  headerRightLines: readonly [string, string, string];
  titleLine1: string;
  titleLine2: string;
};

/** Обложка отчёта «Аудит состояния». */
export const AUDIT_COVER_DECOR: FigmaCoverDecorConfig = {
  headerRightLines: ["АУДИТ СОСТОЯНИЯ", "СОТРУДНИКА", "ОТЧЁТ"],
  titleLine1: "АУДИТ СОСТОЯНИЯ —",
  titleLine2: "ОТЧЁТ",
};

/** Обложка отчёта «Профиль Успеха» (скрининг). */
export const SCREENING_COVER_DECOR: FigmaCoverDecorConfig = {
  headerRightLines: ["ПРОФИЛЬ УСПЕХА", "КАНДИДАТА", "ОТЧЁТ"],
  titleLine1: "ПРОФИЛЬ УСПЕХА —",
  titleLine2: "ОТЧЁТ",
};

const FONT_DIR_SUFFIXES: string[][] = [
  ["public", "report-fonts"],
  ["web", "public", "report-fonts"],
  ["report-fonts"],
  ["src", "assets", "report-fonts"],
  ["web", "src", "assets", "report-fonts"],
];

const BACKGROUND_DIR_SUFFIXES: string[][] = [
  [AUDIT_BACKGROUND_REL[0], AUDIT_BACKGROUND_REL[1]],
  ["web", AUDIT_BACKGROUND_REL[0], AUDIT_BACKGROUND_REL[1]],
];

/** Рисует фоновый PNG макета на странице. */
export function applyFigmaPageBackground(page: PDFPage, background: PDFImage): void {
  page.drawImage(background, {
    x: 0,
    y: 0,
    width: AUDIT_PDF_W,
    height: AUDIT_PDF_H,
  });
}

/** Фон макета и опционально логотип со ссылкой в контикule. */
export function applyFigmaPageBackgroundWithBrand(
  page: PDFPage,
  background: PDFImage,
  brand: ReportBrandPdfStamp | null,
  logoSurface: ReportBrandLogoSurface = "light"
): void {
  applyFigmaPageBackground(page, background);
  if (brand) {
    stampReportBrandOnPdfPage(page, brand, logoSurface);
  }
}

/** Декоративный заголовок обложки (только первая страница). */
export function drawFigmaCoverDecor(
  page: PDFPage,
  fontBold: PDFFont,
  config: FigmaCoverDecorConfig
): void {
  const headerPos = [
    AUDIT_LAYOUT.headerRightLine1,
    AUDIT_LAYOUT.headerRightLine2,
    AUDIT_LAYOUT.headerRightLine3,
  ];
  for (let i = 0; i < config.headerRightLines.length; i += 1) {
    const line = config.headerRightLines[i]!;
    const pos = headerPos[i]!;
    page.drawText(line, {
      x: pos.x,
      y: pos.yBaseline,
      size: 7,
      font: fontBold,
      color: FIGMA_REPORT_WHITE,
    });
  }

  page.drawText(config.titleLine1, {
    x: AUDIT_LAYOUT.titleLine1.x,
    y: AUDIT_LAYOUT.titleLine1.yBaseline,
    size: 22,
    font: fontBold,
    color: FIGMA_REPORT_BRAND,
  });
  page.drawText(config.titleLine2, {
    x: AUDIT_LAYOUT.titleLine2.x,
    y: AUDIT_LAYOUT.titleLine2.yBaseline,
    size: 22,
    font: fontBold,
    color: FIGMA_REPORT_TEXT,
  });
  drawFigmaSectionAccentRule(page, AUDIT_CONTENT_X, AUDIT_LAYOUT.titleRuleY, AUDIT_CONTENT_W);
}

/** Номер страницы в таблетке макета (форма уже на PNG). */
export function drawFigmaPageNumberBadge(
  page: PDFPage,
  fontBold: PDFFont,
  pageNum: number,
  totalPages: number
): void {
  const pill = AUDIT_LAYOUT.pageBadgePill;
  const label = formatAuditPdfPageLabel(pageNum, totalPages);
  const fontSize = label.length > 5 ? 6.5 : 7.5;
  const textWidth = fontBold.widthOfTextAtSize(label, fontSize);
  page.drawText(label, {
    x: pill.x + (pill.w - textWidth) / 2,
    y: pill.y + (pill.h - fontSize) / 2 + fontSize * 0.28,
    size: fontSize,
    font: fontBold,
    color: FIGMA_REPORT_WHITE,
  });
}

/** Проставляет «N / M» на все страницы документа. */
export function finalizeFigmaPageNumbers(doc: PDFDocument, fontBold: PDFFont): void {
  const pages = doc.getPages();
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i += 1) {
    drawFigmaPageNumberBadge(pages[i]!, fontBold, i + 1, totalPages);
  }
}

/** Каталог с NotoSans для PDF. */
export function resolveReportFontsDir(): string {
  const env = process.env.REPORT_FONTS_DIR?.trim();
  if (env) {
    const dir = path.resolve(env);
    if (existsSync(path.join(dir, "NotoSans-Regular.ttf"))) {
      return dir;
    }
  }
  for (const dir of _collectSearchDirs(FONT_DIR_SUFFIXES)) {
    if (existsSync(path.join(dir, "NotoSans-Regular.ttf"))) {
      return dir;
    }
  }
  throw new Error(`PDF: нет NotoSans-Regular.ttf (cwd=${process.cwd()})`);
}

/** Путь к фоновому PNG макета A4. */
export function resolveFigmaBackgroundPath(): string {
  const env = process.env.AUDIT_PDF_BACKGROUND?.trim();
  if (env && existsSync(env)) {
    return path.resolve(env);
  }
  const fileName = AUDIT_BACKGROUND_REL[2];
  for (const dir of _collectSearchDirs(BACKGROUND_DIR_SUFFIXES)) {
    const full = path.join(dir, fileName);
    if (existsSync(full)) {
      return full;
    }
  }
  throw new Error(`PDF: нет ${fileName} (cwd=${process.cwd()})`);
}

/** Загружает байты фонового PNG. */
export function readFigmaBackgroundBytes(): Buffer {
  return readFileSync(resolveFigmaBackgroundPath());
}

/** Встраивает TTF с кириллицей (subset с fallback). */
export async function embedCyrillicFont(
  doc: PDFDocument,
  fontBytes: Uint8Array
): Promise<PDFFont> {
  try {
    return await doc.embedFont(fontBytes, { subset: true });
  } catch {
    return doc.embedFont(fontBytes, { subset: false });
  }
}

function _collectSearchDirs(suffixes: string[][]): string[] {
  const bases: string[] = [];
  let cur = process.cwd();
  for (let i = 0; i < 16; i += 1) {
    bases.push(cur);
    const parent = path.dirname(cur);
    if (parent === cur) {
      break;
    }
    cur = parent;
  }
  const out: string[] = [];
  for (const base of bases) {
    for (const suffix of suffixes) {
      out.push(path.resolve(path.join(base, ...suffix)));
    }
  }
  return [...new Set(out)];
}
