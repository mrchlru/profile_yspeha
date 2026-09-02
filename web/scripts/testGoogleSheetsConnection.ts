/**
 * Проверка подключения к Google Sheets.
 *
 * Локально:
 *   1. Заполните GOOGLE_SHEETS_SPREADSHEET_ID и GOOGLE_SERVICE_ACCOUNT_JSON в web/.env
 *   2. npx tsx scripts/testGoogleSheetsConnection.ts
 *
 * Опционально: GOOGLE_SHEETS_TEST_TAB — имя листа (по умолчанию «Тест подключения»).
 */
import { config } from "dotenv";
import { resolve } from "node:path";

import { formatMoscowNow } from "../src/lib/datetime/moscowTime";
import { requireGoogleSheetsConfigFromEnv } from "../src/lib/googleSheets/googleSheetsConfig";
import {
  appendGoogleSheetRow,
  createGoogleSheetsClient,
  verifyGoogleSheetsAccess,
} from "../src/lib/googleSheets/googleSheetsClient";

config({ path: resolve(process.cwd(), ".env") });

const DEFAULT_TEST_TAB = "Тест подключения";

async function main(): Promise<void> {
  const sheetsConfig = requireGoogleSheetsConfigFromEnv();
  const testTab = process.env.GOOGLE_SHEETS_TEST_TAB?.trim() || DEFAULT_TEST_TAB;
  const sheets = createGoogleSheetsClient(sheetsConfig);

  console.log("Сервисный аккаунт:", sheetsConfig.credentials.client_email);
  console.log("Таблица ID:", sheetsConfig.spreadsheetId);

  const access = await verifyGoogleSheetsAccess({
    sheets,
    spreadsheetId: sheetsConfig.spreadsheetId,
  });
  console.log("Доступ OK. Название таблицы:", access.title);
  console.log("Листы:", access.sheetTitles.join(", ") || "(пусто)");

  if (!access.sheetTitles.includes(testTab)) {
    console.warn(
      `Лист «${testTab}» не найден. Создайте его вручную или укажите GOOGLE_SHEETS_TEST_TAB.`
    );
    console.warn("Пробуем записать в первый лист:", access.sheetTitles[0] ?? "Лист1");
  }

  const targetTab = access.sheetTitles.includes(testTab)
    ? testTab
    : access.sheetTitles[0] ?? "Лист1";

  await appendGoogleSheetRow({
    sheets,
    spreadsheetId: sheetsConfig.spreadsheetId,
    sheetName: targetTab,
    values: [
      formatMoscowNow(),
      "profile-uspeha-test",
      "Подключение Google Sheets работает",
    ],
  });

  console.log(`Записана тестовая строка на лист «${targetTab}».`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Ошибка:", message);
  if (message.includes("permission") || message.includes("403")) {
    console.error(
      "Подсказка: откройте таблицу в Google Sheets и выдайте доступ на редактирование email сервисного аккаунта."
    );
  }
  process.exit(1);
});
