import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  type IParagraphOptions,
} from "docx";

import { buildReportBrandDocxLeadParagraphs } from "@/lib/admin/reportBrandDocx";

/**
 * Собирает буфер .docx из заголовка и абзацев.
 */
export async function packReportExportDocx(
  title: string,
  bodyParagraphs: ReadonlyArray<Paragraph>
): Promise<Buffer> {
  const brandLead = await buildReportBrandDocxLeadParagraphs();
  const doc = new Document({
    sections: [
      {
        children: [
          ...brandLead,
          new Paragraph({
            text: sanitizeDocxPlainText(title),
            heading: HeadingLevel.HEADING_1,
          }),
          ...bodyParagraphs,
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

/** Убирает символы, недопустимые в XML Word. */
export function sanitizeDocxPlainText(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code === 0x9 || code === 0xa || code === 0xd) {
      out += char;
      continue;
    }
    if (code >= 0x20 && code <= 0xd7ff) {
      out += char;
      continue;
    }
    if (code >= 0xe000 && code <= 0xfffd) {
      out += char;
    }
  }
  return out;
}

/** Обычный абзац отчёта. */
export function reportDocxParagraph(text: string, options?: IParagraphOptions): Paragraph {
  const trimmed = sanitizeDocxPlainText(text.trim());
  if (trimmed.length === 0) {
    return new Paragraph({ children: [new TextRun({ text: "" })] });
  }
  return new Paragraph({
    ...options,
    children: [new TextRun({ text: trimmed })],
  });
}

/** Заголовок секции. */
export function reportDocxHeading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel]
): Paragraph {
  return new Paragraph({
    text: sanitizeDocxPlainText(text.trim()),
    heading: level,
  });
}

/** Абзац с жирным фрагментом в начале. */
export function reportDocxBoldLead(lead: string, rest: string): Paragraph {
  const safeLead = sanitizeDocxPlainText(lead.trim());
  const safeRest = sanitizeDocxPlainText(rest.trim());
  return new Paragraph({
    children: [
      new TextRun({ text: safeLead, bold: true }),
      new TextRun({ text: safeRest.length > 0 ? ` ${safeRest}` : "" }),
    ],
  });
}
