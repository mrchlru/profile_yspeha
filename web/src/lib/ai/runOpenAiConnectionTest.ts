import {
  buildOpenAiChatRequestBody,
  classifyOpenAiHttpError,
  openAiChatCompletionsUrl,
  openAiDirectChatCompletionsUrl,
  openAiFetch,
  openAiRequestHeaders,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";

export type OpenAiEnvStatus = {
  hasApiKey: boolean;
  hasBaseUrl: boolean;
  hasRelaySecret: boolean;
  baseUrlHost: string | null;
  model: string;
};

export type OpenAiConnectionTestResult = {
  env: OpenAiEnvStatus;
  ok: boolean;
  reply: string | null;
  durationMs: number | null;
  httpStatus: number | null;
  message: string;
  error: string | null;
  hint: string | null;
  /** Какой endpoint ответил: relay или прямой api.openai.com. */
  endpoint: "relay" | "direct" | null;
};

const TEST_USER_PROMPT = "Ответь одним словом: OK";
const TEST_MAX_COMPLETION_TOKENS = 16;

/**
 * Статус env для OpenAI без раскрытия секретов.
 */
export function readOpenAiEnvStatus(): OpenAiEnvStatus {
  const rawBase = process.env.OPENAI_BASE_URL?.trim() || "";
  return {
    hasApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
    hasBaseUrl: Boolean(rawBase),
    hasRelaySecret: Boolean(process.env.OPENAI_RELAY_SECRET?.trim()),
    baseUrlHost: rawBase ? extractUrlHost(rawBase) : null,
    model: resolveOpenAiChatModel(),
  };
}

/**
 * Минимальный Chat Completions-запрос: проверка ключа, relay и ответа модели.
 */
export async function runOpenAiConnectionTest(): Promise<OpenAiConnectionTestResult> {
  const env = readOpenAiEnvStatus();
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return {
      env,
      ok: false,
      reply: null,
      durationMs: null,
      httpStatus: null,
      message: "OpenAI не настроен на сервере",
      error: "Задайте OPENAI_API_KEY в переменных окружения.",
      hint: "missing_api_key",
      endpoint: null,
    };
  }

  const started = Date.now();
  const init = {
    method: "POST",
    headers: openAiRequestHeaders(apiKey),
    body: JSON.stringify(
      buildOpenAiChatRequestBody({
        model: env.model,
        maxCompletionTokens: TEST_MAX_COMPLETION_TOKENS,
        reasoningEffort: "low" as const,
        temperature: 0,
        responseFormat: { type: "text" },
        messages: [{ role: "user" as const, content: TEST_USER_PROMPT }],
      })
    ),
  };

  const primaryUrl = openAiChatCompletionsUrl();
  const directUrl = openAiDirectChatCompletionsUrl();
  const tryDirectFallback = env.hasBaseUrl && primaryUrl !== directUrl;

  let response: Response;
  let endpoint: "relay" | "direct" = tryDirectFallback ? "relay" : "direct";
  let relayError: string | null = null;

  try {
    response = await openAiFetch(primaryUrl, init);
  } catch (err) {
    relayError = err instanceof Error ? err.message : "Сетевая ошибка";
    if (!tryDirectFallback) {
      return {
        env,
        ok: false,
        reply: null,
        durationMs: Date.now() - started,
        httpStatus: null,
        message: "Не удалось достучаться до OpenAI",
        error: relayError,
        hint: "network_error",
        endpoint: null,
      };
    }
    try {
      response = await openAiFetch(directUrl, init);
      endpoint = "direct";
    } catch (directErr) {
      const directMsg =
        directErr instanceof Error ? directErr.message : "Сетевая ошибка";
      return {
        env,
        ok: false,
        reply: null,
        durationMs: Date.now() - started,
        httpStatus: null,
        message: "Не удалось достучаться до OpenAI (relay и api.openai.com)",
        error: `relay: ${relayError}; direct: ${directMsg}`,
        hint: "network_error",
        endpoint: null,
      };
    }
  }

  const durationMs = Date.now() - started;
  const viaLabel =
    endpoint === "direct" ? "напрямую api.openai.com" : "через relay";

  if (!response.ok) {
    const bodySnippet = await readResponseBodySnippet(response);
    const hint = classifyOpenAiHttpError(response.status, bodySnippet);
    return {
      env,
      ok: false,
      reply: null,
      durationMs,
      httpStatus: response.status,
      message: `OpenAI вернул ошибку (${viaLabel})`,
      error: bodySnippet || `HTTP ${response.status}`,
      hint,
      endpoint,
    };
  }

  const reply = await extractAssistantReply(response);
  if (!reply) {
    return {
      env,
      ok: false,
      reply: null,
      durationMs,
      httpStatus: response.status,
      message: `Ответ получен ${viaLabel}, но текст пустой`,
      error: "В choices[0].message.content нет текста.",
      hint: "empty_reply",
      endpoint,
    };
  }

  return {
    env,
    ok: true,
    reply,
    durationMs,
    httpStatus: response.status,
    message:
      endpoint === "direct" && env.hasBaseUrl
        ? "Связь с OpenAI работает (relay недоступен, сработал fallback на api.openai.com)"
        : "Связь с OpenAI работает",
    error: null,
    hint: null,
    endpoint,
  };
}

/**
 * Достаёт текст assistant из ответа Chat Completions.
 */
async function extractAssistantReply(res: Response): Promise<string | null> {
  try {
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const trimmed = content.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Хост из OPENAI_BASE_URL для отображения в админке.
 */
function extractUrlHost(raw: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).host;
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}
