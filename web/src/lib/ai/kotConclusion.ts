import {
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_KOT_CONCLUSION,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiRequestHeaders,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

type ScreeningConclusionJson = {
  conclusion: string;
  hiringRecommendations?: string;
};

export type ScreeningConclusionResult = {
  conclusion: string | null;
  hiringRecommendations: string | null;
};

/**
 * Запрашивает у OpenAI заключение и рекомендации по найму по полному контексту скрининга.
 * Возвращает null-поля при отсутствии ключа или ошибке API.
 */
export async function generateScreeningConclusion(input: {
  screeningContext: string;
  sessionRef: string;
}): Promise<ScreeningConclusionResult> {
  const empty: ScreeningConclusionResult = { conclusion: null, hiringRecommendations: null };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai", "skipped_no_api_key", { sessionRef: input.sessionRef });
    return empty;
  }

  const model = resolveOpenAiChatModel();
  const userPayload = {
    screeningContext: input.screeningContext,
  };

  const fetchStarted = Date.now();
  let res: Response;
  try {
    res = await fetch(openAiChatCompletionsUrl(), {
      method: "POST",
      headers: openAiRequestHeaders(apiKey),
      body: JSON.stringify(
        buildOpenAiChatRequestBody({
          model,
          temperature: 0.3,
          reasoningEffort: "low",
          maxCompletionTokens: 6000,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_KOT_CONCLUSION },
            {
              role: "user",
              content: JSON.stringify(userPayload),
            },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai", "fetch_network_error", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return empty;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai", "http_error", {
      sessionRef: input.sessionRef,
      model,
      status: res.status,
      durationMs: Date.now() - fetchStarted,
      bodySnippet,
    });
    return empty;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    screeningServerLog("openai", "empty_choices", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
    });
    return empty;
  }

  let parsed: ScreeningConclusionJson;
  try {
    parsed = JSON.parse(text) as ScreeningConclusionJson;
  } catch {
    screeningServerLog("openai", "json_parse_failed", {
      sessionRef: input.sessionRef,
      model,
      responseChars: text.length,
    });
    return empty;
  }

  if (typeof parsed.conclusion !== "string" || parsed.conclusion.length === 0) {
    screeningServerLog("openai", "invalid_conclusion_field", {
      sessionRef: input.sessionRef,
      model,
    });
    return empty;
  }

  const hiring =
    typeof parsed.hiringRecommendations === "string" && parsed.hiringRecommendations.length > 0
      ? parsed.hiringRecommendations.slice(0, 1500)
      : null;

  screeningServerLog("openai", "success", {
    sessionRef: input.sessionRef,
    model,
    conclusionChars: parsed.conclusion.length,
    hiringChars: hiring?.length ?? 0,
    durationMs: Date.now() - fetchStarted,
  });

  return {
    conclusion: parsed.conclusion.slice(0, 5000),
    hiringRecommendations: hiring,
  };
}
