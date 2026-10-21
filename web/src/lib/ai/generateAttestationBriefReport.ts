import {
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_ATTESTATION_BRIEF,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiRequestHeaders,
  openAiFetchChatCompletions,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import type {
  AttestationBriefKeyIndicatorRow,
  AttestationBriefReportJson,
} from "@/lib/attestation/attestationBriefReportTypes";
import type { AttestationEmployeeMeta } from "@/lib/attestation/attestationEmployeeMeta";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

type AttestationBriefReportAiJson = Omit<AttestationBriefReportJson, "version" | "generatedAt">;

function _normalizeStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim());
}

function _parseBriefReport(
  raw: AttestationBriefReportAiJson,
  employeeMeta: AttestationEmployeeMeta,
  keyIndicators: ReadonlyArray<AttestationBriefKeyIndicatorRow>
): AttestationBriefReportJson | null {
  const mainPoints = _normalizeStringArray(raw.mainPoints, 8);
  if (mainPoints.length === 0 || keyIndicators.length === 0) {
    return null;
  }

  return {
    version: 1,
    roleSubtitle: employeeMeta.roleSubtitle,
    managerAudienceLine: employeeMeta.managerAudienceLine,
    mainPoints,
    keyIndicators,
    pros: _normalizeStringArray(raw.pros, 12),
    cons: _normalizeStringArray(raw.cons, 12),
    undergroundGames: _normalizeStringArray(raw.undergroundGames, 8),
    emotionalState: _normalizeStringArray(raw.emotionalState, 8),
    managerTodo: _normalizeStringArray(raw.managerTodo, 12),
    conversationQuestions: _normalizeStringArray(raw.conversationQuestions, 8),
    generatedAt: formatMoscowNow(),
  };
}

/**
 * Запрашивает у OpenAI структурированный краткий отчёт по аттестации.
 */
export async function generateAttestationBriefReport(input: {
  attestationContext: string;
  sessionRef: string;
  employeeMeta: AttestationEmployeeMeta;
  keyIndicators: ReadonlyArray<AttestationBriefKeyIndicatorRow>;
}): Promise<AttestationBriefReportJson | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai_attestation_brief", "skipped_no_api_key", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  const model = resolveOpenAiChatModel();
  const fetchStarted = Date.now();
  let res: Response;
  try {
    res = await openAiFetchChatCompletions({
      method: "POST",
      headers: openAiRequestHeaders(apiKey),
      body: JSON.stringify(
        buildOpenAiChatRequestBody({
          model,
          temperature: 0.35,
          reasoningEffort: "low",
          maxCompletionTokens: 12000,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_ATTESTATION_BRIEF },
            { role: "user", content: JSON.stringify({ attestationContext: input.attestationContext }) },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_attestation_brief", "fetch_network_error", {
      sessionRef: input.sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_attestation_brief", "http_error", {
      sessionRef: input.sessionRef,
      status: res.status,
      bodySnippet,
    });
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    screeningServerLog("openai_attestation_brief", "empty_choices", {
      sessionRef: input.sessionRef,
      durationMs: Date.now() - fetchStarted,
    });
    return null;
  }

  let parsed: AttestationBriefReportAiJson;
  try {
    parsed = JSON.parse(text) as AttestationBriefReportAiJson;
  } catch {
    screeningServerLog("openai_attestation_brief", "json_parse_failed", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  const brief = _parseBriefReport(parsed, input.employeeMeta, input.keyIndicators);
  if (!brief) {
    screeningServerLog("openai_attestation_brief", "invalid_shape", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  screeningServerLog("openai_attestation_brief", "success", {
    sessionRef: input.sessionRef,
    durationMs: Date.now() - fetchStarted,
    indicatorCount: brief.keyIndicators.length,
  });

  return brief;
}
