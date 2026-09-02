import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib";
import { PDFArray, PDFName, PDFString } from "pdf-lib";

import { auditFigmaRectFromTop } from "@/lib/report/auditPdfLayout";
import {
  readReportBrandLogoBytes,
  resolveReportBrandHyperlinkUrl,
  type ReportBrandLogoSurface,
} from "@/lib/report/reportBrandConfig";

/** Зона контикула в макете Figma (левый верх), под полный wordmark. */
const BRAND_LOGO_FIGMA = {
  x: 58,
  yTop: 24,
  w: 360,
  h: 58,
} as const;

export type ReportBrandPdfStamp = {
  logoOnLightSurface: PDFImage | null;
  logoOnDarkSurface: PDFImage | null;
  hyperlinkUrl: string | null;
};

/**
 * Встраивает оба варианта логотипа для PDF; null — нет ни одного файла.
 */
export async function loadReportBrandPdfStamp(
  doc: PDFDocument
): Promise<ReportBrandPdfStamp | null> {
  const onLightBytes = readReportBrandLogoBytes("light");
  const onDarkBytes = readReportBrandLogoBytes("dark");
  if (!onLightBytes && !onDarkBytes) {
    return null;
  }
  try {
    const logoOnLightSurface = onLightBytes
      ? await _embedLogoImage(doc, onLightBytes)
      : null;
    const logoOnDarkSurface = onDarkBytes ? await _embedLogoImage(doc, onDarkBytes) : null;
    if (!logoOnLightSurface && !logoOnDarkSurface) {
      return null;
    }
    return {
      logoOnLightSurface,
      logoOnDarkSurface,
      hyperlinkUrl: resolveReportBrandHyperlinkUrl(),
    };
  } catch (err) {
    console.error("[reportBrand] embed logo failed", err);
    return null;
  }
}

/** Рисует подходящий логотип в шапке и URI-ссылку на сайт. */
export function stampReportBrandOnPdfPage(
  page: PDFPage,
  brand: ReportBrandPdfStamp,
  surface: ReportBrandLogoSurface = "light"
): void {
  const logo = _pickLogoForSurface(brand, surface);
  if (!logo) {
    return;
  }
  const box = auditFigmaRectFromTop(
    BRAND_LOGO_FIGMA.x,
    BRAND_LOGO_FIGMA.yTop,
    BRAND_LOGO_FIGMA.w,
    BRAND_LOGO_FIGMA.h
  );
  const draw = _fitImageInBox(logo.width, logo.height, box);
  page.drawImage(logo, {
    x: draw.x,
    y: draw.y,
    width: draw.w,
    height: draw.h,
  });
  if (brand.hyperlinkUrl) {
    _addPdfUriLinkAnnotation(page, brand.hyperlinkUrl, draw);
  }
}

function _pickLogoForSurface(
  brand: ReportBrandPdfStamp,
  surface: ReportBrandLogoSurface
): PDFImage | null {
  const primary =
    surface === "light" ? brand.logoOnLightSurface : brand.logoOnDarkSurface;
  if (primary) {
    return primary;
  }
  return surface === "light" ? brand.logoOnDarkSurface : brand.logoOnLightSurface;
}

async function _embedLogoImage(doc: PDFDocument, bytes: Buffer): Promise<PDFImage> {
  if (_isPng(bytes)) {
    return doc.embedPng(bytes);
  }
  if (_isJpeg(bytes)) {
    return doc.embedJpg(bytes);
  }
  return doc.embedPng(bytes);
}

function _isPng(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50;
}

function _isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function _fitImageInBox(
  imgW: number,
  imgH: number,
  box: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  if (imgW <= 0 || imgH <= 0) {
    return { x: box.x, y: box.y, w: box.w, h: box.h };
  }
  const scale = Math.min(box.w / imgW, box.h / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: box.x,
    y: box.y + (box.h - h) / 2,
    w,
    h,
  };
}

function _addPdfUriLinkAnnotation(
  page: PDFPage,
  url: string,
  rect: { x: number; y: number; w: number; h: number }
): void {
  const doc = page.doc;
  const context = doc.context;
  const linkRef = context.register(
    context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [rect.x, rect.y, rect.x + rect.w, rect.y + rect.h],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: PDFString.of(url),
      },
    })
  );

  const annotsRef = page.node.get(PDFName.of("Annots"));
  if (annotsRef) {
    const annots = context.lookup(annotsRef, PDFArray);
    annots.push(linkRef);
  } else {
    page.node.set(PDFName.of("Annots"), context.obj([linkRef]));
  }
}
