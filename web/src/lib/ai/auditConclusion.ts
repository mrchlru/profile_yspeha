import type { AuditAiPipelinePayload, AuditHrStructuredReport } from "@/lib/ai/audit/auditAiTypes";
import { OPENAI_AUDIT_HR_RESPONSE_FORMAT } from "@/lib/ai/audit/auditConclusionJsonSchema";
import { buildAuditAiPipelineUserMessage } from "@/lib/ai/audit/buildAuditAiPipelinePayload";
import { OPENAI_SYSTEM_PROMPT_AUDIT_HR_SYNTHESIS } from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiRequestHeaders,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type AuditConclusionResult = {
  yearOverYearDynamics: string | null;
  structured: AuditHrStructuredReport | null;
};

/**
 * Enterprise-pipeline: structured payload → risk engine (уже в payload) → GPT synthesis → HR report.
 */
export async function generateAuditConclusion(input: {
  pipelinePayload: AuditAiPipelinePayload;
  sessionRef: string;
}): Promise<AuditConclusionResult> {
  const empty: AuditConclusionResult = {
    yearOverYearDynamics: null,
    structured: null,
  };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai_audit", "skipped_no_api_key", { sessionRef: input.sessionRef });
    return empty;
  }

  const model = resolveOpenAiChatModel();
  const userMessage = buildAuditAiPipelineUserMessage(input.pipelinePayload);

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
          maxCompletionTokens: 24000,
          responseFormat: OPENAI_AUDIT_HR_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_AUDIT_HR_SYNTHESIS },
            { role: "user", content: userMessage },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_audit", "fetch_network_error", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return empty;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_audit", "http_error", {
      sessionRef: input.sessionRef,
      model,
      status: res.status,
      durationMs: Date.now() - fetchStarted,
      bodySnippet,
      hint:
        res.status === 400 && bodySnippet.includes("temperature")
          ? "reasoning_model_temperature"
          : undefined,
    });
    return empty;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    screeningServerLog("openai_audit", "empty_choices", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
    });
    return empty;
  }

  let structured: AuditHrStructuredReport;
  try {
    structured = JSON.parse(text) as AuditHrStructuredReport;
  } catch {
    screeningServerLog("openai_audit", "json_parse_failed", {
      sessionRef: input.sessionRef,
      model,
      responseChars: text.length,
    });
    return empty;
  }

  if (!_isValidStructuredReport(structured)) {
    screeningServerLog("openai_audit", "invalid_structured_report", {
      sessionRef: input.sessionRef,
      model,
    });
    return empty;
  }

  const yearOverYearDynamics =
    structured.yearOverYearDynamics.trim().length > 0
      ? structured.yearOverYearDynamics.slice(0, 16000)
      : null;

  screeningServerLog("openai_audit", "success", {
    sessionRef: input.sessionRef,
    model,
    insights: structured.methodologyInsights.length,
    dynamicsChars: yearOverYearDynamics?.length ?? 0,
    durationMs: Date.now() - fetchStarted,
  });

  return { yearOverYearDynamics, structured };
}

function _isValidStructuredReport(report: AuditHrStructuredReport): boolean {
  return (
    typeof report.intelligenceVerdict === "string" &&
    report.intelligenceVerdict.length > 0 &&
    typeof report.risksAndAdditional === "string" &&
    report.risksAndAdditional.length > 0 &&
    Array.isArray(report.methodologyInsights) &&
    typeof report.managerBriefConclusion === "string" &&
    report.managerBriefConclusion.length > 0
  );
}
