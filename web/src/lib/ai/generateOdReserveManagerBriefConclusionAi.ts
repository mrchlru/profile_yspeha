import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import {
  MANAGER_BRIEF_AI_PROMPT_VERSION,
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_OD_RESERVE_MANAGER_BRIEF,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  classifyOpenAiHttpError,
  openAiRequestHeaders,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiManagerBriefChatModel,
} from "@/lib/ai/openaiHttp";
import { buildOdReserveManagerBriefAiContext } from "@/lib/audit/report/buildOdReserveManagerBriefAiContext";
import type { ManagerBriefLineOverrides } from "@/lib/audit/report/resolveOdReservePsychologicalState";
import { MANAGER_BRIEF_CONCLUSION_STYLE_EXAMPLE } from "@/lib/audit/report/managerBriefConclusionExample";
import { sanitizeManagerBriefConclusionText } from "@/lib/audit/report/sanitizeManagerBriefConclusionText";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

type ManagerBriefAiJson = {
  conclusion: string;
};

/**
 * Генерирует блок «Заключение» для отчёта руководителю (ОД/ТУ) через OpenAI.
 */
export async function generateOdReserveManagerBriefConclusionAi(input: {
  answers: AuditAnswersMap;
  sessionRef: string;
  lineOverrides?: ManagerBriefLineOverrides;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai_manager_brief", "skipped_no_api_key", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  const model = resolveOpenAiManagerBriefChatModel();
  const testSignals = buildOdReserveManagerBriefAiContext(input.answers, input.lineOverrides);
  const userPayload = {
    promptVersion: MANAGER_BRIEF_AI_PROMPT_VERSION,
    styleExample: MANAGER_BRIEF_CONCLUSION_STYLE_EXAMPLE,
    testSignals,
    reportLines: testSignals.reportLines,
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
          temperature: 0.45,
          reasoningEffort: "low",
          maxCompletionTokens: 4800,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_OD_RESERVE_MANAGER_BRIEF },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_manager_brief", "fetch_network_error", {
      sessionRef: input.sessionRef,
      model,
      promptVersion: MANAGER_BRIEF_AI_PROMPT_VERSION,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_manager_brief", "http_error", {
      sessionRef: input.sessionRef,
      model,
      promptVersion: MANAGER_BRIEF_AI_PROMPT_VERSION,
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
    screeningServerLog("openai_manager_brief", "empty_choices", {
      sessionRef: input.sessionRef,
      model,
      promptVersion: MANAGER_BRIEF_AI_PROMPT_VERSION,
      durationMs: Date.now() - fetchStarted,
    });
    return null;
  }

  let parsed: ManagerBriefAiJson;
  try {
    parsed = JSON.parse(text) as ManagerBriefAiJson;
  } catch {
    screeningServerLog("openai_manager_brief", "json_parse_failed", {
      sessionRef: input.sessionRef,
      responseChars: text.length,
    });
    return null;
  }

  if (typeof parsed.conclusion !== "string" || parsed.conclusion.trim().length < 80) {
    screeningServerLog("openai_manager_brief", "invalid_conclusion", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  const cleaned = sanitizeManagerBriefConclusionText(parsed.conclusion);
  screeningServerLog("openai_manager_brief", "success", {
    sessionRef: input.sessionRef,
    model,
    promptVersion: MANAGER_BRIEF_AI_PROMPT_VERSION,
    durationMs: Date.now() - fetchStarted,
    chars: cleaned.length,
  });
  return cleaned;
}
