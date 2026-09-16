import {
  EXECUTIVE_MANAGER_REPORT_AI_PROMPT_VERSION,
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_EXECUTIVE_MANAGER_REPORT,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  classifyOpenAiHttpError,
  openAiFetchChatCompletions,
  openAiRequestHeaders,
  readResponseBodySnippet,
  resolveOpenAiManagerBriefChatModel,
} from "@/lib/ai/openaiHttp";
import type { ExecutiveManagerReportAiContext } from "@/lib/audit/report/buildExecutiveManagerReportAiContext";
import {
  EXECUTIVE_HR_ANALYSIS_14_TITLES,
  EXECUTIVE_MANAGER_REPORT_VERSION,
  type ExecutiveHrAnalysisItem,
  type ExecutiveManagerReportV1,
} from "@/lib/audit/report/executiveManagerReportTypes";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

/**
 * Генерирует экспертный отчёт для собственника/HRD через OpenAI.
 */
export async function generateExecutiveManagerReportAi(input: {
  context: ExecutiveManagerReportAiContext;
  sessionRef: string;
}): Promise<ExecutiveManagerReportV1 | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai_executive_manager", "skipped_no_api_key", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  const model = resolveOpenAiManagerBriefChatModel();
  const userPayload = {
    promptVersion: EXECUTIVE_MANAGER_REPORT_AI_PROMPT_VERSION,
    fullName: input.context.fullName,
    reportProfile: input.context.reportProfile,
    hrAnalysisTitles: input.context.hrAnalysisTitles,
    signals: input.context.signals,
  };

  const fetchStarted = Date.now();
  let res: Response;
  try {
    res = await openAiFetchChatCompletions({
      method: "POST",
      headers: openAiRequestHeaders(apiKey),
      body: JSON.stringify(
        buildOpenAiChatRequestBody({
          model,
          temperature: 0.4,
          reasoningEffort: "medium",
          maxCompletionTokens: 12000,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_EXECUTIVE_MANAGER_REPORT },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_executive_manager", "fetch_network_error", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_executive_manager", "http_error", {
      sessionRef: input.sessionRef,
      model,
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
    screeningServerLog("openai_executive_manager", "empty_choices", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
    });
    return null;
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    screeningServerLog("openai_executive_manager", "json_parse_failed", {
      sessionRef: input.sessionRef,
      responseChars: text.length,
    });
    return null;
  }

  const normalized = _normalizeExecutiveReport(raw, input.context);
  if (normalized === null) {
    screeningServerLog("openai_executive_manager", "normalize_failed", {
      sessionRef: input.sessionRef,
    });
    return null;
  }

  screeningServerLog("openai_executive_manager", "success", {
    sessionRef: input.sessionRef,
    model,
    promptVersion: EXECUTIVE_MANAGER_REPORT_AI_PROMPT_VERSION,
    durationMs: Date.now() - fetchStarted,
    chars: text.length,
  });
  return normalized;
}

function _normalizeExecutiveReport(
  raw: Record<string, unknown>,
  context: ExecutiveManagerReportAiContext
): ExecutiveManagerReportV1 | null {
  const keyTakeaway = _asNonEmptyString(raw.keyTakeaway);
  const purpose = _asNonEmptyString(raw.purpose);
  if (!keyTakeaway || !purpose) {
    return null;
  }

  const executiveSummaryRaw = _asObject(raw.executiveSummary);
  const paragraphs = _asStringArray(executiveSummaryRaw?.paragraphs);
  const keyConclusion = _asNonEmptyString(executiveSummaryRaw?.keyConclusion);
  if (paragraphs.length === 0 || !keyConclusion) {
    return null;
  }

  const overall = _asObject(raw.overallAssessment);
  const strengths = _asObject(raw.strengths);
  const motivation = _asObject(raw.motivationProfile);
  const style = _asObject(raw.managementStyle);
  const psycho = _asObject(raw.psychoEmotional);
  const workload = _asObject(raw.workload);
  const recommendations = _asObject(raw.recommendations);
  const finalConclusion = _asObject(raw.finalConclusion);

  const hrAnalysis14 = _normalizeHrAnalysis14(raw.hrAnalysis14);
  if (hrAnalysis14 === null) {
    return null;
  }

  const scorecard = _asKeyValueRows(raw.scorecard);
  if (scorecard.length < 5) {
    return null;
  }

  return {
    version: EXECUTIVE_MANAGER_REPORT_VERSION,
    generatedAt: formatMoscowNow(),
    fullName: context.fullName,
    reportProfile: context.reportProfile,
    keyTakeaway,
    purpose,
    executiveSummary: { paragraphs, keyConclusion },
    overallAssessment: {
      lead: _asNonEmptyString(overall?.lead) ?? "",
      bullets: _asStringArray(overall?.bullets),
      closing: _asNonEmptyString(overall?.closing) ?? "",
    },
    strengths: {
      managerial: _asStringArray(strengths?.managerial),
      personal: _asStringArray(strengths?.personal),
    },
    motivationProfile: {
      lead: _asNonEmptyString(motivation?.lead) ?? "",
      drivers: _asStringArray(motivation?.drivers),
    },
    managementStyle: {
      lead: _asNonEmptyString(style?.lead) ?? "",
      focusPoints: _asStringArray(style?.focusPoints),
      conflictNote: _asNonEmptyString(style?.conflictNote) ?? "",
      bestFit: _asStringArray(style?.bestFit),
    },
    psychoEmotional: {
      lead: _asNonEmptyString(psycho?.lead) ?? "",
      findings: _asStringArray(psycho?.findings),
      implications: _asStringArray(psycho?.implications),
      closing: _asNonEmptyString(psycho?.closing) ?? "",
    },
    workload: {
      objectiveLabel: _asNonEmptyString(workload?.objectiveLabel) ?? "—",
      objectiveText: _asNonEmptyString(workload?.objectiveText) ?? "",
      subjectiveLabel: _asNonEmptyString(workload?.subjectiveLabel) ?? "—",
      subjectiveText: _asNonEmptyString(workload?.subjectiveText) ?? "",
      emotionalLabel: _asNonEmptyString(workload?.emotionalLabel) ?? "—",
      emotionalText: _asNonEmptyString(workload?.emotionalText) ?? "",
      overloadRiskLabel: _asNonEmptyString(workload?.overloadRiskLabel) ?? "—",
      metricsTable: _asKeyValueRows(workload?.metricsTable),
      expertNote: _asNonEmptyString(workload?.expertNote) ?? "",
    },
    businessRisks: _asRiskRows(raw.businessRisks),
    recommendations: {
      groups: _asRecommendationGroups(recommendations?.groups),
    },
    finalConclusion: {
      paragraphs: _asStringArray(finalConclusion?.paragraphs),
      managerialVerdict: _asNonEmptyString(finalConclusion?.managerialVerdict) ?? "",
    },
    scorecard,
    hrAnalysis14,
  };
}

function _normalizeHrAnalysis14(value: unknown): ExecutiveHrAnalysisItem[] | null {
  if (!Array.isArray(value) || value.length < 10) {
    return null;
  }
  const byTitle = new Map<string, string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { title?: unknown; content?: unknown };
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const content = typeof row.content === "string" ? row.content.trim() : "";
    if (title && content) {
      byTitle.set(title, content);
    }
  }

  const ordered: ExecutiveHrAnalysisItem[] = [];
  for (const title of EXECUTIVE_HR_ANALYSIS_14_TITLES) {
    const content = byTitle.get(title);
    if (!content) {
      // fallback: fuzzy match by prefix
      const fuzzy = [...byTitle.entries()].find(([key]) => key.includes(title.slice(0, 18)));
      if (!fuzzy) {
        return null;
      }
      ordered.push({ title, content: fuzzy[1] });
    } else {
      ordered.push({ title, content });
    }
  }
  return ordered;
}

function _asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function _asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function _asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function _asKeyValueRows(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: Array<{ label: string; value: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { label?: unknown; value?: unknown };
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const val = typeof row.value === "string" ? row.value.trim() : "";
    if (label && val) {
      rows.push({ label, value: val });
    }
  }
  return rows;
}

function _asRiskRows(value: unknown): Array<{ title: string; text: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: Array<{ title: string; text: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { title?: unknown; text?: unknown };
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (title && text) {
      rows.push({ title, text });
    }
  }
  return rows;
}

function _asRecommendationGroups(
  value: unknown
): Array<{ title: string; items: string[] }> {
  if (!Array.isArray(value)) {
    return [];
  }
  const groups: Array<{ title: string; items: string[] }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { title?: unknown; items?: unknown };
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const items = _asStringArray(row.items);
    if (title && items.length > 0) {
      groups.push({ title, items });
    }
  }
  return groups;
}
