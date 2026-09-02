import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import {
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_PSYCHOLOGICAL_STATE,
  PSYCHOLOGICAL_STATE_AI_PROMPT_VERSION,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  classifyOpenAiHttpError,
  openAiRequestHeaders,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiManagerBriefChatModel,
} from "@/lib/ai/openaiHttp";
import { buildPsychologicalStateSignals } from "@/lib/audit/report/buildPsychologicalStateSignals";
import { sanitizeManagerBriefConclusionText } from "@/lib/audit/report/sanitizeManagerBriefConclusionText";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

type PsychologicalStateAiJson = {
  conclusion: string;
};

/**
 * Генерирует пункт «Психологическое состояние» для отчёта руководителю через OpenAI.
 */
export async function generateOdReservePsychologicalStateAi(input: {
  answers: AuditAnswersMap;
  sessionRef: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai_psych_state", "skipped_no_api_key", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  const signals = buildPsychologicalStateSignals(input.answers);
  if (signals.indicators.length === 0) {
    return null;
  }

  const model = resolveOpenAiManagerBriefChatModel();
  const userPayload = {
    promptVersion: PSYCHOLOGICAL_STATE_AI_PROMPT_VERSION,
    indicators: signals.indicators,
    complete: signals.complete,
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
          temperature: 0.35,
          reasoningEffort: "low",
          maxCompletionTokens: 2400,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_PSYCHOLOGICAL_STATE },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_psych_state", "fetch_network_error", {
      sessionRef: input.sessionRef,
      model,
      promptVersion: PSYCHOLOGICAL_STATE_AI_PROMPT_VERSION,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_psych_state", "http_error", {
      sessionRef: input.sessionRef,
      model,
      promptVersion: PSYCHOLOGICAL_STATE_AI_PROMPT_VERSION,
      status: res.status,
      durationMs: Date.now() - fetchStarted,
      bodySnippet,
      hint: classifyOpenAiHttpError(res.status, bodySnippet),
    });
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    screeningServerLog("openai_psych_state", "empty_choices", {
      sessionRef: input.sessionRef,
      model,
      promptVersion: PSYCHOLOGICAL_STATE_AI_PROMPT_VERSION,
      durationMs: Date.now() - fetchStarted,
    });
    return null;
  }

  let parsed: PsychologicalStateAiJson;
  try {
    parsed = JSON.parse(text) as PsychologicalStateAiJson;
  } catch {
    screeningServerLog("openai_psych_state", "json_parse_failed", {
      sessionRef: input.sessionRef,
      responseChars: text.length,
    });
    return null;
  }

  if (typeof parsed.conclusion !== "string" || parsed.conclusion.trim().length < 40) {
    screeningServerLog("openai_psych_state", "invalid_conclusion", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  const cleaned = sanitizeManagerBriefConclusionText(parsed.conclusion);
  screeningServerLog("openai_psych_state", "success", {
    sessionRef: input.sessionRef,
    model,
    promptVersion: PSYCHOLOGICAL_STATE_AI_PROMPT_VERSION,
    durationMs: Date.now() - fetchStarted,
    chars: cleaned.length,
  });
  return cleaned;
}
