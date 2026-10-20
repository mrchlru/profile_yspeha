import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { buildReportBrandDocxLeadParagraphs } from "@/lib/admin/reportBrandDocx";
import { sanitizeDocxPlainText } from "@/lib/admin/reportExportDocxShell";
import type { AttestationBriefReportJson } from "@/lib/attestation/attestationBriefReportTypes";

const FONT = "Arial";
const BODY_SIZE = 20;
const HEADING_COLOR = "1F3A5F";
const MUTED_COLOR = "666666";

export type AttestationBriefReportDocxMeta = {
  personName: string;
  attestationDateLabel: string;
  reportDateLabel: string;
};

/**
 * Собирает .docx краткого отчёта по аттестации (оформление по шаблону заказчика).
 */
export async function buildAttestationBriefReportDocx(
  brief: AttestationBriefReportJson,
  meta: AttestationBriefReportDocxMeta
): Promise<Buffer> {
  const brandLead = await buildReportBrandDocxLeadParagraphs();
  const children: Array<Paragraph | Table> = [
    ...brandLead,
    _confidentialParagraph(),
    _titleParagraph("Отчёт по аттестации — краткая версия"),
    _bodyParagraph(`${meta.personName} · ${brief.roleSubtitle}`, { bold: true }),
    _bodyParagraph(
      `Аттестация ${meta.attestationDateLabel} · отчёт ${meta.reportDateLabel} · ${brief.managerAudienceLine}`
    ),
    _sectionHeading("1. Главное"),
    ...brief.mainPoints.map((text) => _bodyParagraph(text)),
    _sectionHeading("2. Ключевые показатели"),
    _keyIndicatorsTable(brief),
    _sectionHeading("3. Плюсы"),
    ..._bulletParagraphs(brief.pros),
    _sectionHeading("4. Минусы — явные и скрытые"),
    ..._bulletParagraphs(brief.cons),
    _sectionHeading("5. Подковерные игры"),
    ...brief.undergroundGames.map((text) => _bodyParagraph(text)),
    _sectionHeading("6. Эмоциональное состояние и место в коллективе"),
    ...brief.emotionalState.map((text) => _bodyParagraph(text)),
    _sectionHeading("7. Что делать руководителю"),
    ..._bulletParagraphs(brief.managerTodo),
    _sectionHeading("8. Вопросы для разговора"),
    ...brief.conversationQuestions.map((text) => _bodyParagraph(text)),
  ];

  const doc = new Document({
    sections: [{ children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

function _confidentialParagraph(): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: sanitizeDocxPlainText(
          "КОНФИДЕНЦИАЛЬНО · ТОЛЬКО ДЛЯ НЕПОСРЕДСТВЕННОГО РУКОВОДИТЕЛЯ"
        ),
        font: FONT,
        size: 18,
        bold: true,
        color: MUTED_COLOR,
      }),
    ],
  });
}

function _titleParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: sanitizeDocxPlainText(text),
        font: FONT,
        size: 28,
        bold: true,
        color: HEADING_COLOR,
      }),
    ],
  });
}

function _sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: sanitizeDocxPlainText(text),
        font: FONT,
        size: 24,
        bold: true,
        color: HEADING_COLOR,
      }),
    ],
  });
}

function _bodyParagraph(
  text: string,
  options?: { bold?: boolean }
): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: sanitizeDocxPlainText(text),
        font: FONT,
        size: BODY_SIZE,
        bold: options?.bold ?? false,
      }),
    ],
  });
}

function _bulletParagraphs(items: ReadonlyArray<string>): Paragraph[] {
  return items.map(
    (text) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "• ", font: FONT, size: BODY_SIZE, bold: true }),
          new TextRun({ text: sanitizeDocxPlainText(text), font: FONT, size: BODY_SIZE }),
        ],
      })
  );
}

function _keyIndicatorsTable(brief: AttestationBriefReportJson): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const headerRow = new TableRow({
    tableHeader: true,
    children: ["Показатель", "Результат", "Что это значит"].map(
      (label) =>
        new TableCell({
          borders,
          shading: { fill: "E8EEF4" },
          width: { size: 33, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  font: FONT,
                  size: 20,
                  bold: true,
                  color: HEADING_COLOR,
                }),
              ],
            }),
          ],
        })
    ),
  });

  const dataRows = brief.keyIndicators.map(
    (row) =>
      new TableRow({
        children: [row.indicator, row.result, row.meaning].map(
          (cellText, index) =>
            new TableCell({
              borders,
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sanitizeDocxPlainText(cellText),
                      font: FONT,
                      size: 20,
                      bold: index === 0,
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}
