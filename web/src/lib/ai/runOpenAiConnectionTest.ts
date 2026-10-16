import {
  buildOpenAiChatRequestBody,
  classifyOpenAiHttpError,
  isReasoningChatModel,
  openAiChatCompletionsUrl,
  openAiDirectChatCompletionsUrl,
  openAiFetch,
  openAiRequestHeaders,
  parseOpenAiChatCompletionJson,
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
/** Reasoning-модели (gpt-5) при малом лимите отдают HTTP 200 с пустым content. */
const TEST_MAX_COMPLETION_TOKENS = 512;
const TEST_MAX_COMPLETION_TOKENS_RETRY = 2048;

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
  const primaryUrl = openAiChatCompletionsUrl();
  const directUrl = openAiDirectChatCompletionsUrl();
  const tryDirectFallback = env.hasBaseUrl && primaryUrl !== directUrl;

  let response: Response;
  let endpoint: "relay" | "direct" = tryDirectFallback ? "relay" : "direct";
  let relayError: string | null = null;

  const buildInit = (maxCompletionTokens: number, reasoningEffort: "none" | "low"): RequestInit => ({
    method: "POST",
    headers: openAiRequestHeaders(apiKey),
    body: JSON.stringify(
      buildOpenAiChatRequestBody({
        model: env.model,
        maxCompletionTokens,
        reasoningEffort,
        temperature: 0,
        responseFormat: { type: "text" },
        messages: [{ role: "user" as const, content: TEST_USER_PROMPT }],
      })
    ),
  });

  const init = buildInit(
    TEST_MAX_COMPLETION_TOKENS,
    isReasoningChatModel(env.model) ? "none" : "low"
  );

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
    const message =
      hint === "quota_exhausted"
        ? `Нет кредитов OpenAI (${viaLabel})`
        : `OpenAI вернул ошибку (${viaLabel})`;
    return {
      env,
      ok: false,
      reply: null,
      durationMs,
      httpStatus: response.status,
      message,
      error: bodySnippet || `HTTP ${response.status}`,
      hint,
      endpoint,
    };
  }

  let parsed = await readChatCompletionFromResponse(response);
  let reply = parsed?.text ?? null;

  if (
    !reply &&
    isReasoningChatModel(env.model) &&
    response.ok
  ) {
    const retryResponse = await openAiFetch(
      endpoint === "direct" ? directUrl : primaryUrl,
      buildInit(TEST_MAX_COMPLETION_TOKENS_RETRY, "low")
    );
    if (retryResponse.ok) {
      response = retryResponse;
      parsed = await readChatCompletionFromResponse(retryResponse);
      reply = parsed?.text ?? null;
    }
  }

  if (!reply) {
    const detail = _formatEmptyReplyDiagnostics(parsed, env.model);
    return {
      env,
      ok: false,
      reply: null,
      durationMs,
      httpStatus: response.status,
      message: `Ответ получен ${viaLabel}, но текст пустой`,
      error: detail,
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

async function readChatCompletionFromResponse(
  res: Response
): Promise<ReturnType<typeof parseOpenAiChatCompletionJson>> {
  try {
    const json = await res.json();
    return parseOpenAiChatCompletionJson(json);
  } catch {
    return null;
  }
}

function _formatEmptyReplyDiagnostics(
  parsed: ReturnType<typeof parseOpenAiChatCompletionJson>,
  model: string
): string {
  if (!parsed) {
    return "Не удалось разобрать JSON ответа.";
  }
  const parts = [
    "В choices[0].message.content нет текста.",
    parsed.finishReason ? `finish_reason: ${parsed.finishReason}` : null,
    parsed.refusal ? `refusal: ${parsed.refusal}` : null,
    isReasoningChatModel(model)
      ? "У reasoning-моделей (gpt-5) короткий лимит токенов может «съесть» ответ; проверка уже увеличивает лимит. Если повторяется — OPENAI_TEST_MODEL=gpt-4o-mini или пополните баланс OpenAI."
      : null,
  ].filter((line): line is string => Boolean(line));
  return parts.join(" ");
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
