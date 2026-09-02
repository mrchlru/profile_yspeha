import type { sheets_v4 } from "googleapis";

import type {
  GoogleSheetsColumnDef,
  GoogleSheetsSheetSchema,
} from "@/lib/googleSheets/googleSheetsSheetSchemas";
import { googleSheetsColumnCount } from "@/lib/googleSheets/googleSheetsSheetSchemas";

const HEADER_ROWS = 2;

/** Строит две строки заголовков и описание merge/ширин колонок. */
export function buildGoogleSheetsHeaderLayout(schema: GoogleSheetsSheetSchema): {
  row1: string[];
  row2: string[];
  mergeRequests: sheets_v4.Schema$Request[];
  columnWidthRequests: sheets_v4.Schema$Request[];
} {
  const row1: string[] = [];
  const row2: string[] = [];
  const mergeRequests: sheets_v4.Schema$Request[] = [];
  const columnWidthRequests: sheets_v4.Schema$Request[] = [];
  let columnIndex = 0;

  for (const column of schema.columns) {
    if (column.kind === "single") {
      row1.push(column.titleRow1);
      row2.push(column.titleRow2);
      mergeRequests.push(_mergeVertical(columnIndex, HEADER_ROWS));
      columnWidthRequests.push(_columnWidth(columnIndex, column.widthPx));
      columnIndex += 1;
      continue;
    }

    const groupSize = column.columns.length;
    for (let childIndex = 0; childIndex < groupSize; childIndex += 1) {
      const child = column.columns[childIndex];
      if (child === undefined) {
        continue;
      }
      row1.push(childIndex === 0 ? column.titleRow1 : "");
      row2.push(child.titleRow2);
      columnWidthRequests.push(_columnWidth(columnIndex + childIndex, child.widthPx));
    }
    if (groupSize > 1) {
      mergeRequests.push(_mergeHorizontal(columnIndex, groupSize));
    } else {
      mergeRequests.push(_mergeVertical(columnIndex, HEADER_ROWS));
    }
    columnIndex += groupSize;
  }

  return { row1, row2, mergeRequests, columnWidthRequests };
}

/** Число строк шапки (данные начинаются ниже). */
export function googleSheetsHeaderRowCount(): number {
  return HEADER_ROWS;
}

/** Индекс следующего порядкового номера по количеству уже записанных строк данных. */
export function googleSheetsNextSequenceNumber(existingDataRowCount: number): number {
  return Math.max(1, existingDataRowCount + 1);
}

/** Проверяет, что лист уже инициализирован нашей шапкой. */
export function isGoogleSheetsHeaderReady(firstCellValue: string | undefined): boolean {
  return firstCellValue?.trim() === "№";
}

/** Колонка A1 для проверки шапки. */
export function googleSheetsHeaderProbeRange(sheetTitle: string): string {
  return `'${sheetTitle}'!A1`;
}

/** Диапазон шапки целиком. */
export function googleSheetsHeaderWriteRange(sheetTitle: string, columnCount: number): string {
  const lastColumn = _columnLetter(columnCount);
  return `'${sheetTitle}'!A1:${lastColumn}2`;
}

/** Диапазон для подсчёта строк данных (колонка A). */
export function googleSheetsDataColumnRange(sheetTitle: string): string {
  return `'${sheetTitle}'!A:A`;
}

export function googleSheetsSchemaColumnCount(schema: GoogleSheetsSheetSchema): number {
  return googleSheetsColumnCount(schema);
}

function _mergeVertical(columnIndex: number, rowSpan: number): sheets_v4.Schema$Request {
  return {
    mergeCells: {
      range: {
        startRowIndex: 0,
        endRowIndex: rowSpan,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
      mergeType: "MERGE_ALL",
    },
  };
}

function _mergeHorizontal(columnIndex: number, columnSpan: number): sheets_v4.Schema$Request {
  return {
    mergeCells: {
      range: {
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + columnSpan,
      },
      mergeType: "MERGE_ALL",
    },
  };
}

function _columnWidth(columnIndex: number, widthPx: number): sheets_v4.Schema$Request {
  return {
    updateDimensionProperties: {
      range: {
        sheetId: 0,
        dimension: "COLUMNS",
        startIndex: columnIndex,
        endIndex: columnIndex + 1,
      },
      properties: { pixelSize: widthPx },
      fields: "pixelSize",
    },
  };
}

function _columnLetter(columnCount: number): string {
  let n = columnCount;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || "A";
}

/** Подставляет реальный sheetId в запросы ширины/merge. */
export function withGoogleSheetId(
  requests: ReadonlyArray<sheets_v4.Schema$Request>,
  sheetId: number
): sheets_v4.Schema$Request[] {
  return requests.map((request) => {
    if (request.mergeCells?.range) {
      return {
        mergeCells: {
          ...request.mergeCells,
          range: { ...request.mergeCells.range, sheetId },
        },
      };
    }
    if (request.updateDimensionProperties?.range) {
      return {
        updateDimensionProperties: {
          ...request.updateDimensionProperties,
          range: { ...request.updateDimensionProperties.range, sheetId },
        },
      };
    }
    return request;
  });
}

export function flattenGoogleSheetsColumns(schema: GoogleSheetsSheetSchema): ReadonlyArray<GoogleSheetsColumnDef> {
  return schema.columns;
}
