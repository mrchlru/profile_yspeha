import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import {
  appendGoogleSheetRow,
  createGoogleSheetsClient,
  verifyGoogleSheetsAccess,
} from "@/lib/googleSheets/googleSheetsClient";
import {
  readGoogleSheetsConfigFromEnv,
  type GoogleSheetsConfig,
} from "@/lib/googleSheets/googleSheetsConfig";

export type GoogleSheetsEnvStatus = {
  configured: boolean;
  hasSpreadsheetId: boolean;
  hasServiceAccountJson: boolean;
  serviceAccountEmail: string | null;
  configError: string | null;
};

export type GoogleSheetsConnectionTestResult = {
  env: GoogleSheetsEnvStatus;
  ok: boolean;
  spreadsheetTitle: string | null;
  sheetTitles: string[];
  testRowWritten: boolean;
  testTab: string | null;
  message: string;
  error: string | null;
};

const DEFAULT_TEST_TAB = "Тест подключения";

/**
 * Проверяет наличие переменных окружения без раскрытия секретов.
 */
export function readGoogleSheetsEnvStatus(): GoogleSheetsEnvStatus {
  const hasSpreadsheetId = Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim());
  const hasServiceAccountJson = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
  let serviceAccountEmail: string | null = null;
  let configError: string | null = null;

  if (hasSpreadsheetId && hasServiceAccountJson) {
    try {
      const config = readGoogleSheetsConfigFromEnv();
      serviceAccountEmail = config?.credentials.client_email ?? null;
    } catch (error) {
      configError = error instanceof Error ? error.message : "Некорректный JSON ключа";
    }
  }

  return {
    configured: hasSpreadsheetId && hasServiceAccountJson && configError === null,
    hasSpreadsheetId,
    hasServiceAccountJson,
    serviceAccountEmail,
    configError,
  };
}

/**
 * Проверяет доступ к таблице и при необходимости пишет тестовую строку.
 */
export async function runGoogleSheetsConnectionTest(input?: {
  writeTestRow?: boolean;
  testTab?: string;
}): Promise<GoogleSheetsConnectionTestResult> {
  const env = readGoogleSheetsEnvStatus();
  const writeTestRow = input?.writeTestRow === true;
  const preferredTab = input?.testTab?.trim() || process.env.GOOGLE_SHEETS_TEST_TAB?.trim() || DEFAULT_TEST_TAB;

  if (!env.hasSpreadsheetId || !env.hasServiceAccountJson) {
    return {
      env,
      ok: false,
      spreadsheetTitle: null,
      sheetTitles: [],
      testRowWritten: false,
      testTab: null,
      message: "Интеграция не настроена на сервере",
      error: _missingEnvMessage(env),
    };
  }

  if (env.configError !== null) {
    return {
      env,
      ok: false,
      spreadsheetTitle: null,
      sheetTitles: [],
      testRowWritten: false,
      testTab: null,
      message: "Переменные заданы, но JSON ключа не читается",
      error: env.configError,
    };
  }

  let config: GoogleSheetsConfig;
  try {
    const loaded = readGoogleSheetsConfigFromEnv();
    if (loaded === null) {
      throw new Error("Конфигурация Google Sheets не найдена");
    }
    config = loaded;
  } catch (error) {
    return {
      env,
      ok: false,
      spreadsheetTitle: null,
      sheetTitles: [],
      testRowWritten: false,
      testTab: null,
      message: "Не удалось прочитать конфигурацию",
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    };
  }

  try {
    const sheets = createGoogleSheetsClient(config);
    const access = await verifyGoogleSheetsAccess({
      sheets,
      spreadsheetId: config.spreadsheetId,
    });

    let testRowWritten = false;
    let testTab: string | null = null;
    if (writeTestRow) {
      testTab = access.sheetTitles.includes(preferredTab)
        ? preferredTab
        : access.sheetTitles[0] ?? "Лист1";
      await appendGoogleSheetRow({
        sheets,
        spreadsheetId: config.spreadsheetId,
        sheetName: testTab,
        values: [formatMoscowNow(), "admin-test", "Проверка из админ-панели"],
      });
      testRowWritten = true;
    }

    return {
      env,
      ok: true,
      spreadsheetTitle: access.title,
      sheetTitles: access.sheetTitles,
      testRowWritten,
      testTab,
      message: writeTestRow
        ? `Подключение работает. Тестовая строка записана на лист «${testTab ?? preferredTab}».`
        : "Подключение работает. Таблица доступна сервисному аккаунту.",
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    return {
      env,
      ok: false,
      spreadsheetTitle: null,
      sheetTitles: [],
      testRowWritten: false,
      testTab: null,
      message: "Сервер не смог обратиться к Google Sheets",
      error: _humanizeGoogleError(errorMessage, env.serviceAccountEmail),
    };
  }
}

function _missingEnvMessage(env: GoogleSheetsEnvStatus): string {
  const missing: string[] = [];
  if (!env.hasSpreadsheetId) {
    missing.push("GOOGLE_SHEETS_SPREADSHEET_ID");
  }
  if (!env.hasServiceAccountJson) {
    missing.push("GOOGLE_SERVICE_ACCOUNT_JSON");
  }
  return `В Railway не заданы: ${missing.join(", ")}`;
}

function _humanizeGoogleError(message: string, serviceAccountEmail: string | null): string {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("403") || lower.includes("caller does not have")) {
    return (
      "Нет доступа к таблице. Откройте Google Sheets и выдайте права «Редактор» email сервисного аккаунта" +
      (serviceAccountEmail ? `: ${serviceAccountEmail}` : ".")
    );
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return "Таблица не найдена. Проверьте GOOGLE_SHEETS_SPREADSHEET_ID.";
  }
  if (lower.includes("unable to parse") || lower.includes("json")) {
    return "GOOGLE_SERVICE_ACCOUNT_JSON повреждён. Вставьте весь JSON одной строкой.";
  }
  return message;
}
