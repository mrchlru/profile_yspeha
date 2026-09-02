/**
 * Общие настройки HTTP-вызовов OpenAI Chat Completions (только server-side).
 *
 * Раньше в коде по умолчанию стояла модель `gpt-5-mini-2025-08-07`, которой нет
 * у большинства аккаунтов / ключей — запросы возвращали 400/404 и заключение
 * молча обнулялось. Дефолт — `gpt-5.5` для HR synthesis; точную модель
 * модель всегда можно задать через `OPENAI_MODEL` в окружении.
 */

export const OPENAI_DEFAULT_CHAT_MODEL = "gpt-5.5";

/** Модель для заключения «Отчёт для руководителя» (ОД/ТУ); можно задать новее через env. */
export const OPENAI_DEFAULT_MANAGER_BRIEF_CHAT_MODEL = "gpt-5.5";

/** GPT-5 / o-series не принимают произвольный `temperature` в Chat Completions. */
export function isReasoningChatModel(model: string): boolean {
  const m = model.trim().toLowerCase();
  return m.startsWith("gpt-5") || /^o[0-9]/.test(m);
}

export type OpenAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type BuildOpenAiChatRequestBodyInput = {
  model: string;
  messages: ReadonlyArray<OpenAiChatMessage>;
  responseFormat: unknown;
  /** Игнорируется для reasoning-моделей (gpt-5, o-series). */
  temperature?: number;
  maxCompletionTokens?: number;
  /** Только для gpt-5; для audit synthesis достаточно `low`. */
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
};

/**
 * Собирает тело POST /v1/chat/completions с учётом ограничений reasoning-моделей.
 */
export function buildOpenAiChatRequestBody(
  input: BuildOpenAiChatRequestBodyInput
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
    response_format: input.responseFormat,
    max_completion_tokens: input.maxCompletionTokens ?? 24000,
  };

  if (!isReasoningChatModel(input.model)) {
    body.temperature = input.temperature ?? 0.3;
  } else {
    body.reasoning_effort = input.reasoningEffort ?? "low";
  }

  return body;
}

/** Возвращает имя модели из `OPENAI_MODEL` или стабильный дефолт. */
export function resolveOpenAiChatModel(): string {
  const m = process.env.OPENAI_MODEL?.trim();
  return m && m.length > 0 ? m : OPENAI_DEFAULT_CHAT_MODEL;
}

/**
 * Модель для генерации финального «Заключения» в отчёте для руководителя (ОД/ТУ).
 * `OPENAI_MANAGER_BRIEF_MODEL` — если задан; иначе `OPENAI_MODEL` / дефолт.
 */
export function resolveOpenAiManagerBriefChatModel(): string {
  const dedicated = process.env.OPENAI_MANAGER_BRIEF_MODEL?.trim();
  if (dedicated && dedicated.length > 0) {
    return dedicated;
  }
  return resolveOpenAiChatModel();
}

/**
 * Полный URL Chat Completions. База: `OPENAI_BASE_URL` или `https://api.openai.com`
 * (без завершающего `/`).
 */
export function openAiChatCompletionsUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com";
  const base = raw.replace(/\/$/, "");
  return `${base}/v1/chat/completions`;
}

/**
 * Читает тело ответа для логирования при `!response.ok` (до повторного чтения
 * поток уже потреблён).
 */
export async function readResponseBodySnippet(
  res: Response,
  maxChars = 800
): Promise<string> {
  try {
    const text = await res.text();
    if (text.length === 0) {
      return "";
    }
    return text.length <= maxChars ? text : `${text.slice(0, maxChars)}…`;
  } catch {
    return "(тело ответа недоступно)";
  }
}

export type OpenAiHttpErrorHint =
  | "quota_exhausted"
  | "invalid_model"
  | "reasoning_model_temperature"
  | "rate_limit"
  | "unknown";

/**
 * Краткая классификация HTTP-ошибки OpenAI для логов (без повторного чтения тела).
 */
export function classifyOpenAiHttpError(
  status: number,
  bodySnippet: string
): OpenAiHttpErrorHint {
  const body = bodySnippet.toLowerCase();
  if (
    status === 429 &&
    (body.includes("insufficient_quota") ||
      body.includes("credit_balance_exhausted") ||
      body.includes("no credits remaining"))
  ) {
    return "quota_exhausted";
  }
  if (status === 429) {
    return "rate_limit";
  }
  if (status === 404 && body.includes("model")) {
    return "invalid_model";
  }
  if (status === 400 && body.includes("temperature")) {
    return "reasoning_model_temperature";
  }
  if (status === 400 && body.includes("model")) {
    return "invalid_model";
  }
  return "unknown";
}
