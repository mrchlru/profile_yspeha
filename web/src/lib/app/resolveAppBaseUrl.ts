/**
 * Возвращает публичный базовый URL приложения для ссылок в письмах и приглашениях.
 *
 * Порядок: APP_URL → NEXT_PUBLIC_APP_URL → RAILWAY_PUBLIC_DOMAIN → VERCEL_URL.
 * На проде localhost не используется.
 */
export function resolveAppBaseUrl(): string {
  const explicit = _firstNonEmpty(
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
  if (explicit) {
    return _stripTrailingSlash(explicit);
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return _stripTrailingSlash(_ensureHttps(railwayDomain));
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return _stripTrailingSlash(_ensureHttps(vercelHost));
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Публичный URL приложения не настроен. Укажите APP_URL (или NEXT_PUBLIC_APP_URL) в переменных окружения."
    );
  }

  return "http://localhost:3000";
}

function _firstNonEmpty(...values: ReadonlyArray<string | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function _stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function _ensureHttps(hostOrUrl: string): string {
  if (/^https?:\/\//i.test(hostOrUrl)) {
    return hostOrUrl;
  }
  return `https://${hostOrUrl}`;
}
