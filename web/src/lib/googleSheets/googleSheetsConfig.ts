import { z } from "zod";

const serviceAccountSchema = z.object({
  type: z.literal("service_account"),
  project_id: z.string().min(1),
  private_key_id: z.string().min(1),
  private_key: z.string().min(1),
  client_email: z.string().email(),
  client_id: z.string().min(1),
  auth_uri: z.string().url(),
  token_uri: z.string().url(),
  auth_provider_x509_cert_url: z.string().url(),
  client_x509_cert_url: z.string().url(),
  universe_domain: z.string().optional(),
});

export type GoogleServiceAccountCredentials = z.infer<typeof serviceAccountSchema>;

export type GoogleSheetsConfig = {
  spreadsheetId: string;
  credentials: GoogleServiceAccountCredentials;
};

/**
 * Читает JSON сервисного аккаунта из `GOOGLE_SERVICE_ACCOUNT_JSON`.
 * На Railway ключ обычно кладут одной строкой; переносы в `private_key` могут быть экранированы как `\\n`.
 */
export function parseGoogleServiceAccountJson(raw: string): GoogleServiceAccountCredentials {
  const trimmed = raw.trim();
  const parsed = JSON.parse(trimmed) as unknown;
  const result = serviceAccountSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON: некорректный формат сервисного аккаунта");
  }
  return {
    ...result.data,
    private_key: result.data.private_key.replace(/\\n/g, "\n"),
  };
}

/**
 * Возвращает конфиг Google Sheets или `null`, если интеграция не настроена.
 */
export function readGoogleSheetsConfigFromEnv(): GoogleSheetsConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!spreadsheetId || !serviceAccountJson) {
    return null;
  }
  return {
    spreadsheetId,
    credentials: parseGoogleServiceAccountJson(serviceAccountJson),
  };
}

/**
 * То же, что `readGoogleSheetsConfigFromEnv`, но бросает ошибку при отсутствии переменных.
 */
export function requireGoogleSheetsConfigFromEnv(): GoogleSheetsConfig {
  const config = readGoogleSheetsConfigFromEnv();
  if (config === null) {
    throw new Error(
      "Google Sheets не настроен: задайте GOOGLE_SHEETS_SPREADSHEET_ID и GOOGLE_SERVICE_ACCOUNT_JSON"
    );
  }
  return config;
}
