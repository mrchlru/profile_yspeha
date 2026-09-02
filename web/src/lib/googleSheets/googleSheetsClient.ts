import { google, type sheets_v4 } from "googleapis";

import {
  requireGoogleSheetsConfigFromEnv,
  type GoogleSheetsConfig,
} from "@/lib/googleSheets/googleSheetsConfig";
import {
  buildGoogleSheetsHeaderLayout,
  googleSheetsHeaderWriteRange,
  googleSheetsHeaderRowCount,
  googleSheetsHeaderProbeRange,
  googleSheetsDataColumnRange,
  withGoogleSheetId,
} from "@/lib/googleSheets/googleSheetsSheetLayout";
import type { GoogleSheetsSheetSchema } from "@/lib/googleSheets/googleSheetsSheetSchemas";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/**
 * Создаёт авторизованный клиент Google Sheets API (сервисный аккаунт).
 */
export function createGoogleSheetsClient(config: GoogleSheetsConfig): sheets_v4.Sheets {
  const auth = new google.auth.JWT({
    email: config.credentials.client_email,
    key: config.credentials.private_key,
    scopes: [SHEETS_SCOPE],
  });
  return google.sheets({ version: "v4", auth });
}

/**
 * Клиент из переменных окружения.
 */
export function createGoogleSheetsClientFromEnv(): sheets_v4.Sheets {
  return createGoogleSheetsClient(requireGoogleSheetsConfigFromEnv());
}

/**
 * Добавляет одну строку в конец листа (`append`).
 */
export async function appendGoogleSheetRow(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetName: string;
  values: ReadonlyArray<string | number | boolean | null>;
}): Promise<void> {
  await input.sheets.spreadsheets.values.append({
    spreadsheetId: input.spreadsheetId,
    range: `${input.sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [input.values.map((cell) => (cell === null ? "" : cell))],
    },
  });
}

/**
 * Проверяет, что таблица доступна сервисному аккаунту (чтение метаданных).
 */
export async function verifyGoogleSheetsAccess(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
}): Promise<{ title: string; sheetTitles: string[] }> {
  const meta = await input.sheets.spreadsheets.get({
    spreadsheetId: input.spreadsheetId,
    fields: "properties.title,sheets.properties.title,sheets.properties.sheetId",
  });
  const title = meta.data.properties?.title ?? "(без названия)";
  const sheetTitles =
    meta.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((name): name is string => Boolean(name)) ?? [];
  return { title, sheetTitles };
}

/**
 * Создаёт лист с заданным названием, если его ещё нет.
 */
export async function ensureGoogleSheetTab(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTitle: string;
}): Promise<void> {
  const meta = await input.sheets.spreadsheets.get({
    spreadsheetId: input.spreadsheetId,
    fields: "sheets.properties.title",
  });
  const exists =
    meta.data.sheets?.some((sheet) => sheet.properties?.title === input.sheetTitle) ?? false;
  if (exists) {
    return;
  }
  await input.sheets.spreadsheets.batchUpdate({
    spreadsheetId: input.spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: input.sheetTitle } } }],
    },
  });
}

/** Возвращает numeric sheetId вкладки. */
export async function getGoogleSheetTabId(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTitle: string;
}): Promise<number> {
  const meta = await input.sheets.spreadsheets.get({
    spreadsheetId: input.spreadsheetId,
    fields: "sheets.properties.title,sheets.properties.sheetId",
  });
  const sheet = meta.data.sheets?.find((entry) => entry.properties?.title === input.sheetTitle);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined || sheetId === null) {
    throw new Error(`Лист «${input.sheetTitle}» не найден`);
  }
  return sheetId;
}

/** Читает значение A1. */
export async function readGoogleSheetFirstCell(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTitle: string;
}): Promise<string | undefined> {
  const res = await input.sheets.spreadsheets.values.get({
    spreadsheetId: input.spreadsheetId,
    range: googleSheetsHeaderProbeRange(input.sheetTitle),
  });
  const value = res.data.values?.[0]?.[0];
  return typeof value === "string" ? value : undefined;
}

/** Считает строки данных (ниже двухстрочной шапки) по колонке A. */
export async function countGoogleSheetDataRows(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTitle: string;
}): Promise<number> {
  const res = await input.sheets.spreadsheets.values.get({
    spreadsheetId: input.spreadsheetId,
    range: googleSheetsDataColumnRange(input.sheetTitle),
  });
  const values = res.data.values ?? [];
  const filled = values.filter((row) => {
    const cell = row[0];
    return cell !== undefined && String(cell).trim().length > 0;
  }).length;
  return Math.max(0, filled - googleSheetsHeaderRowCount());
}

/** Записывает двухстрочную шапку, merge и ширины колонок. */
export async function initializeGoogleSheetTabHeaders(input: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTitle: string;
  sheetId: number;
  schema: GoogleSheetsSheetSchema;
}): Promise<void> {
  const layout = buildGoogleSheetsHeaderLayout(input.schema);
  await input.sheets.spreadsheets.values.update({
    spreadsheetId: input.spreadsheetId,
    range: googleSheetsHeaderWriteRange(
      input.sheetTitle,
      layout.row1.length
    ),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [layout.row1, layout.row2],
    },
  });

  const requests = withGoogleSheetId(
    [...layout.mergeRequests, ...layout.columnWidthRequests],
    input.sheetId
  );
  if (requests.length === 0) {
    return;
  }
  await input.sheets.spreadsheets.batchUpdate({
    spreadsheetId: input.spreadsheetId,
    requestBody: { requests },
  });
}
