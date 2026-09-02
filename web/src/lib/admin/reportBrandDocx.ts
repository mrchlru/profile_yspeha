import { ExternalHyperlink, ImageRun, Paragraph, TextRun } from "docx";
import sharp from "sharp";

import { DEFAULT_REPORT_BRAND_HYPERLINK_URL } from "@/lib/report/reportBrandConstants";
import { readReportBrandLogoBytes } from "@/lib/report/reportBrandConfig";

/** Максимальный размер логотипа в Word (пропорции сохраняются). */
const DOCX_LOGO_MAX_WIDTH_PX = 320;
const DOCX_LOGO_MAX_HEIGHT_PX = 48;

/**
 * Абзацы с логотипом в начале документа (Word надёжнее, чем картинка-ссылка в header).
 */
export async function buildReportBrandDocxLeadParagraphs(): Promise<Paragraph[]> {
  const bytes = readReportBrandLogoBytes("light");
  if (!bytes) {
    return [];
  }
  const type = _docxImageType(bytes);
  const size = await _docxLogoTransformation(bytes);
  const imageRun = new ImageRun({
    type,
    data: bytes,
    transformation: size,
  });

  const logoParagraph = new Paragraph({
    children: [imageRun],
  });

  const linkParagraph = new Paragraph({
    children: [
      new ExternalHyperlink({
        link: DEFAULT_REPORT_BRAND_HYPERLINK_URL,
        children: [
          new TextRun({
            text: "www.bts-kognium.ru",
            style: "Hyperlink",
            size: 18,
          }),
        ],
      }),
    ],
  });

  return [logoParagraph, linkParagraph];
}

/** Вписывает логотип в рамку без искажения пропорций. */
async function _docxLogoTransformation(
  bytes: Buffer
): Promise<{ width: number; height: number }> {
  const meta = await sharp(bytes).metadata();
  const imgW = meta.width ?? 1022;
  const imgH = meta.height ?? 386;
  if (imgW <= 0 || imgH <= 0) {
    return { width: DOCX_LOGO_MAX_WIDTH_PX, height: DOCX_LOGO_MAX_HEIGHT_PX };
  }
  const scale = Math.min(DOCX_LOGO_MAX_WIDTH_PX / imgW, DOCX_LOGO_MAX_HEIGHT_PX / imgH);
  return {
    width: Math.max(1, Math.round(imgW * scale)),
    height: Math.max(1, Math.round(imgH * scale)),
  };
}

function _docxImageType(bytes: Buffer): "png" | "jpg" {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "jpg";
  }
  return "png";
}
