import { randomBytes } from "node:crypto";

/**
 * Генерирует неугадиваемый токен общей ссылки (сервер).
 */
export function generateSurveyPublicLinkToken(): string {
  return randomBytes(18).toString("hex");
}
