import {
  formatAnswerValueForExport,
  isSkippedAnswerExportKey,
  resolveAnswerColumnMeta,
  sortAnswerColumnKeys,
  type AnswerColumnMeta,
} from "@/lib/admin/answersExportColumnCatalog";
import { csvEscapeCell, flattenAnswersForCsv } from "@/lib/admin/flattenAnswersForCsv";
import type { RawAnswersRecord } from "@/lib/admin/fetchRawAnswersRecords";
import { REPORT_EXPORT_TEST_KIND_LABELS, type ReportExportTestKind } from "@/lib/admin/reportExportKinds";

const META_COLUMNS = ["№", "Фамилия", "Имя", "Дата прохождения", "Тип теста"] as const;

export type AnswersComparisonCsvOptions = {
  layout: "combined" | "separate_per_person";
};

type FlatAnswerRow = Record<string, string>;

/**
 * CSV для сравнения ответов: люди строками, вопросы колонками (или отдельный файл на человека).
 */
export function buildAnswersComparisonExport(
  records: ReadonlyArray<RawAnswersRecord>,
  options: AnswersComparisonCsvOptions
): Buffer | Array<{ fileName: string; data: Buffer }> {
  if (records.length === 0) {
    return Buffer.from("\uFEFF", "utf-8");
  }

  const testKind = records[0]!.testKind;
  const flatRows = records.map((record) => _flatRowForRecord(record));
  const columnMetas = _collectColumnMetas(testKind, flatRows);

  if (options.layout === "separate_per_person") {
    return flatRows.map((row, index) => {
      const record = records[index]!;
      return {
        fileName: _personFileName(record),
        data: _buildVerticalPersonCsv(record, row, columnMetas),
      };
    });
  }

  return _buildCombinedCsv(records, flatRows, columnMetas);
}

function _collectColumnMetas(
  testKind: ReportExportTestKind,
  flatRows: ReadonlyArray<FlatAnswerRow>
): AnswerColumnMeta[] {
  const keys = new Set<string>();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      if (!isSkippedAnswerExportKey(key)) {
        keys.add(key);
      }
    }
  }
  return sortAnswerColumnKeys(keys).map((key) => resolveAnswerColumnMeta(testKind, key));
}

function _flatRowForRecord(record: RawAnswersRecord): FlatAnswerRow {
  const answersPayload = _answersPayloadForComparison(record);
  return flattenAnswersForCsv(answersPayload);
}

function _answersPayloadForComparison(record: RawAnswersRecord): Record<string, unknown> {
  if (record.testKind === "screening") {
    const answers = record.answers;
    return {
      step1: answers.step1,
      step2: answers.step2,
      step3: answers.step3,
      step4: answers.step4,
    };
  }
  if (record.testKind === "audit_middle" || record.testKind === "audit_senior") {
    return { steps: record.answers.steps ?? record.answers };
  }
  if (record.testKind === "burnout") {
    return { maslach: record.answers.maslach ?? record.answers };
  }
  return record.answers;
}

function _buildCombinedCsv(
  records: ReadonlyArray<RawAnswersRecord>,
  flatRows: ReadonlyArray<FlatAnswerRow>,
  columnMetas: ReadonlyArray<AnswerColumnMeta>
): Buffer {
  const header = [...META_COLUMNS, ...columnMetas.map((meta) => meta.headerLabel)];
  const lines = [
    header.map(csvEscapeCell).join(","),
    ...records.map((record, index) => {
      const row = flatRows[index]!;
      const metaCells = [
        String(index + 1),
        record.lastName,
        record.firstName,
        record.completedAt,
        REPORT_EXPORT_TEST_KIND_LABELS[record.testKind],
      ];
      const answerCells = columnMetas.map((meta) =>
        csvEscapeCell(formatAnswerValueForExport(meta.key, row[meta.key] ?? ""))
      );
      return [...metaCells, ...answerCells].map(csvEscapeCell).join(",");
    }),
  ];
  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf-8");
}

function _buildVerticalPersonCsv(
  record: RawAnswersRecord,
  flatRow: FlatAnswerRow,
  columnMetas: ReadonlyArray<AnswerColumnMeta>
): Buffer {
  const lines: string[] = [
    ["Фамилия", record.lastName].map(csvEscapeCell).join(","),
    ["Имя", record.firstName].map(csvEscapeCell).join(","),
    ["Дата прохождения", record.completedAt].map(csvEscapeCell).join(","),
    ["Тип теста", REPORT_EXPORT_TEST_KIND_LABELS[record.testKind]].map(csvEscapeCell).join(","),
    "",
    ["№", "Раздел", "Вопрос", "Ответ"].map(csvEscapeCell).join(","),
  ];

  let questionNumber = 0;
  for (const meta of columnMetas) {
    const rawValue = flatRow[meta.key] ?? "";
    if (!rawValue.trim()) {
      continue;
    }
    questionNumber += 1;
    const cells = [
      String(questionNumber),
      meta.sectionLabel,
      meta.questionLabel,
      formatAnswerValueForExport(meta.key, rawValue),
    ];
    lines.push(cells.map(csvEscapeCell).join(","));
  }

  if (questionNumber === 0) {
    lines.push(["—", "—", "Нет ответов", "—"].map(csvEscapeCell).join(","));
  }

  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf-8");
}

function _personFileName(record: RawAnswersRecord): string {
  const safeLast = _safeFilePart(record.lastName);
  const safeFirst = _safeFilePart(record.firstName);
  const datePart = record.completedAt.slice(0, 10).replace(/\./g, "-");
  return `otvety_${safeLast}_${safeFirst}_${datePart}.csv`;
}

function _safeFilePart(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned || "kandidat";
}
