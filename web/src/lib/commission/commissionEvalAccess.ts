import { randomBytes } from "node:crypto";

import { resolveAppBaseUrl } from "@/lib/app/resolveAppBaseUrl";

/**
 * Генерирует токен доступа к оценочному листу комиссии.
 */
export function generateCommissionEvalAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Ссылка на оценочный лист участника комиссии.
 */
export function buildCommissionEvalSheetUrl(accessToken: string): string {
  const baseUrl = resolveAppBaseUrl();
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(baseUrl)) {
    throw new Error(
      "Ссылка на оценочный лист указывает на localhost. Задайте APP_URL на сервере."
    );
  }
  return `${baseUrl}/commission/eval/${encodeURIComponent(accessToken)}`;
}
