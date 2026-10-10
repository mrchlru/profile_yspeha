import {
  clampAiPlainText,
  stripManagerActionsHeading,
} from "@/lib/ai/clampAiPlainText";
import {
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_SPECIALIST_SCREENING_CONCLUSION,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiRequestHeaders,
  openAiFetchChatCompletions,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

/** Запас под полный бриф со всеми разделами, включая «ОГРАНИЧЕНИЯ ИНСТРУМЕНТА». */
const CONCLUSION_MAX_CHARS = 12000;
const MANAGER_ACTIONS_MAX_CHARS = 2500;

type SpecialistScreeningConclusionJson = {
  conclusion: string;
  managerActions?: string;
};

export type SpecialistScreeningConclusionResult = {
  conclusionText: string | null;
  managerActions: string | null;
};

/**
 * Запрашивает у OpenAI управленческий бриф по скринингу депрессивных симптомов.
 */
export async function generateSpecialistScreeningConclusion(input: {
  screeningContext: string;
  sessionRef: string;
}): Promise<SpecialistScreeningConclusionResult> {
  const empty: SpecialistScreeningConclusionResult = {
    conclusionText: null,
    managerActions: null,
  };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai_specialist_screening", "skipped_no_api_key", {
      sessionRef: input.sessionRef,
    });
    return empty;
  }

  const model = resolveOpenAiChatModel();
  const userPayload = { screeningContext: input.screeningContext };

  const fetchStarted = Date.now();
  let res: Response;
  try {
    res = await openAiFetchChatCompletions({
      method: "POST",
      headers: openAiRequestHeaders(apiKey),
      body: JSON.stringify(
        buildOpenAiChatRequestBody({
          model,
          temperature: 0.3,
          reasoningEffort: "low",
          maxCompletionTokens: 7000,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_SPECIALIST_SCREENING_CONCLUSION },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_specialist_screening", "fetch_network_error", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return empty;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_specialist_screening", "http_error", {
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
    screeningServerLog("openai_specialist_screening", "empty_choices", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
    });
    return empty;
  }

  let parsed: SpecialistScreeningConclusionJson;
  try {
    parsed = JSON.parse(text) as SpecialistScreeningConclusionJson;
  } catch {
    screeningServerLog("openai_specialist_screening", "json_parse_failed", {
      sessionRef: input.sessionRef,
      model,
      responseChars: text.length,
    });
    return empty;
  }

  if (typeof parsed.conclusion !== "string" || parsed.conclusion.length === 0) {
    screeningServerLog("openai_specialist_screening", "invalid_conclusion_field", {
      sessionRef: input.sessionRef,
      model,
    });
    return empty;
  }

  const managerActions =
    typeof parsed.managerActions === "string" && parsed.managerActions.length > 0
      ? clampAiPlainText(
          stripManagerActionsHeading(parsed.managerActions),
          MANAGER_ACTIONS_MAX_CHARS
        )
      : null;

  const conclusionText = clampAiPlainText(parsed.conclusion, CONCLUSION_MAX_CHARS);

  screeningServerLog("openai_specialist_screening", "success", {
    sessionRef: input.sessionRef,
    model,
    conclusionChars: conclusionText.length,
    rawConclusionChars: parsed.conclusion.length,
    managerActionsChars: managerActions?.length ?? 0,
    durationMs: Date.now() - fetchStarted,
  });

  return {
    conclusionText,
    managerActions,
  };
}
