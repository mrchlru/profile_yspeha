export const UNSTABLE_CONNECTION_MESSAGE =
  "Интернет-соединение нестабильно. Проверьте подключение к сети и попробуйте снова.";

/** Ошибка: нет сети или сервер не принял сохранение. */
export class UnstableConnectionError extends Error {
  constructor(message: string = UNSTABLE_CONNECTION_MESSAGE) {
    super(message);
    this.name = "UnstableConnectionError";
  }
}

/**
 * Проверяет флаг браузера «в сети» перед отправкой ответов.
 */
export function assertBrowserOnline(): void {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new UnstableConnectionError();
  }
}

/**
 * POST JSON: без офлайн-очереди; при ошибке сети или ответа — исключение.
 */
export async function postJsonRequireOnline(url: string, body: unknown): Promise<void> {
  assertBrowserOnline();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new UnstableConnectionError();
  }
  if (!response.ok) {
    throw new UnstableConnectionError();
  }
  const text = await response.text();
  if (text.length === 0) {
    return;
  }
  let payload: { ok?: boolean; error?: string };
  try {
    payload = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    throw new UnstableConnectionError();
  }
  if (payload.ok === false) {
    throw new UnstableConnectionError(
      typeof payload.error === "string" && payload.error.length > 0
        ? payload.error
        : UNSTABLE_CONNECTION_MESSAGE
    );
  }
  if (payload.ok !== true && typeof payload.error === "string" && payload.error.length > 0) {
    throw new UnstableConnectionError(payload.error);
  }
}