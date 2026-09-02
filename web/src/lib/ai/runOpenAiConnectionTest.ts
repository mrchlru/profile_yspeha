import {
  buildOpenAiChatRequestBody,
  classifyOpenAiHttpError,
  openAiChatCompletionsUrl,
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
    };
  }

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(openAiChatCompletionsUrl(), {
      method: "POST",
      headers: openAiRequestHeaders(apiKey),
      body: JSON.stringify(
        buildOpenAiChatRequestBody({
          model: env.model,
          maxCompletionTokens: TEST_MAX_COMPLETION_TOKENS,
          reasoningEffort: "low",
          temperature: 0,
          responseFormat: { type: "text" },
          messages: [{ role: "user", content: TEST_USER_PROMPT }],
        })
      ),
    });
  } catch (err) {
    return {
      env,
      ok: false,
      reply: null,
      durationMs: Date.now() - started,
      httpStatus: null,
      message: "Не удалось достучаться до OpenAI",
      error: err instanceof Error ? err.message : "Сетевая ошибка",
      hint: "network_error",
    };
  }

  const durationMs = Date.now() - started;

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    const hint = classifyOpenAiHttpError(res.status, bodySnippet);
    return {
      env,
      ok: false,
      reply: null,
      durationMs,
      httpStatus: res.status,
      message: "OpenAI вернул ошибку",
      error: bodySnippet || `HTTP ${res.status}`,
      hint,
    };
  }

  const reply = await extractAssistantReply(res);
  if (!reply) {
    return {
      env,
      ok: false,
      reply: null,
      durationMs,
      httpStatus: res.status,
      message: "Ответ получен, но текст пустой",
      error: "В choices[0].message.content нет текста.",
      hint: "empty_reply",
    };
  }

  return {
    env,
    ok: true,
    reply,
    durationMs,
    httpStatus: res.status,
    message: "Связь с OpenAI работает",
    error: null,
    hint: null,
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
    return new URL(raw).host;
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}
