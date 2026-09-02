/** Координаты макета Figma «A4 - 1» (1054×1492) → PDF A4. */
export const AUDIT_FIGMA_W = 1054;
export const AUDIT_FIGMA_H = 1492;

export const AUDIT_PDF_W = 595.28;
export const AUDIT_PDF_H = 841.89;

export const AUDIT_PDF_SX = AUDIT_PDF_W / AUDIT_FIGMA_W;
export const AUDIT_PDF_SY = AUDIT_PDF_H / AUDIT_FIGMA_H;

/** Бирюзовый акцент макета (#00B596). */
export const AUDIT_BRAND_RGB = { r: 0 / 255, g: 181 / 255, b: 150 / 255 } as const;

export type AuditPdfLayoutPoint = {
  x: number;
  yBaseline: number;
};

/**
 * Переводит X и верхнюю границу строки из Figma (origin сверху-слева) в PDF (baseline снизу-слева).
 */
export function auditFigmaTextPos(
  xFigma: number,
  yTopFigma: number,
  fontSizePt: number
): AuditPdfLayoutPoint {
  const baselineFromTop = yTopFigma + fontSizePt * 0.82;
  return {
    x: xFigma * AUDIT_PDF_SX,
    yBaseline: AUDIT_PDF_H - baselineFromTop * AUDIT_PDF_SY,
  };
}

/** Горизонтальная зона текста (не заезжать на декор справа). */
export const AUDIT_CONTENT_X = 58 * AUDIT_PDF_SX;
export const AUDIT_CONTENT_W = 720 * AUDIT_PDF_SX;

export type AuditPdfRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Переводит прямоугольник из Figma (origin сверху-слева) в PDF (origin снизу-слева).
 */
export function auditFigmaRectFromTop(
  xFigma: number,
  yTopFigma: number,
  wFigma: number,
  hFigma: number
): AuditPdfRect {
  return {
    x: xFigma * AUDIT_PDF_SX,
    y: (AUDIT_FIGMA_H - (yTopFigma + hFigma)) * AUDIT_PDF_SY,
    w: wFigma * AUDIT_PDF_SX,
    h: hFigma * AUDIT_PDF_SY,
  };
}

/** Центр окружности из Figma (origin сверху-слева) → PDF (origin снизу-слева). */
export function auditFigmaCircleCenter(
  cxFigma: number,
  cyTopFigma: number,
  rFigma: number
): { cx: number; cy: number; r: number } {
  return {
    cx: cxFigma * AUDIT_PDF_SX,
    cy: AUDIT_PDF_H - cyTopFigma * AUDIT_PDF_SY,
    r: rFigma * AUDIT_PDF_SX,
  };
}

/** Правый декоративный блок обложки (смещён вправо для читаемости «Ё»). */
const COVER_HEADER_RIGHT_X_FIGMA = 788;

export const AUDIT_LAYOUT = {
  logo: auditFigmaTextPos(58, 52, 11),
  logoAccent: auditFigmaTextPos(118, 52, 11),
  headerRightLine1: {
    x: COVER_HEADER_RIGHT_X_FIGMA * AUDIT_PDF_SX,
    yBaseline: auditFigmaTextPos(COVER_HEADER_RIGHT_X_FIGMA, 48, 7).yBaseline,
  },
  headerRightLine2: {
    x: COVER_HEADER_RIGHT_X_FIGMA * AUDIT_PDF_SX,
    yBaseline: auditFigmaTextPos(COVER_HEADER_RIGHT_X_FIGMA, 65, 7).yBaseline,
  },
  headerRightLine3: {
    x: COVER_HEADER_RIGHT_X_FIGMA * AUDIT_PDF_SX,
    yBaseline: auditFigmaTextPos(COVER_HEADER_RIGHT_X_FIGMA, 82, 7).yBaseline,
  },
  titleLine1: auditFigmaTextPos(58, 158, 22),
  /** Ниже line1 — чтобы точки «Ё» не налезали на строку выше. */
  titleLine2: auditFigmaTextPos(58, 204, 22),
  titleRuleY: auditFigmaTextPos(58, 244, 1).yBaseline,
  sectionIconX: 62 * AUDIT_PDF_SX,
  sectionTextX: 130 * AUDIT_PDF_SX,
  participantSectionY: 268,
  metricsSectionY: 398,
  yoySectionY: 548,
  stepsSectionY: 698,
  conclusionSectionY: 998,
  footerUrlY: auditFigmaTextPos(0, 1410, 8).yBaseline,
  /** Таблетка нумерации в правом нижнем углу макета (Figma 901×1442, 69×29). */
  pageBadgePill: auditFigmaRectFromTop(901, 1442, 69, 29),
  /** Тонкое кольцо вокруг таблетки на страницах без фонового PNG. */
  pageBadgeRing: auditFigmaCircleCenter(935, 1410, 52),
  contentBottom: 118 * AUDIT_PDF_SY,
} as const;

/** Подпись номера страницы в таблетке макета. */
export function formatAuditPdfPageLabel(pageNum: number, totalPages: number): string {
  return `${String(pageNum)} / ${String(totalPages)}`;
}

export const AUDIT_BACKGROUND_REL = ["public", "report-assets", "audit-a4-background.png"] as const;
