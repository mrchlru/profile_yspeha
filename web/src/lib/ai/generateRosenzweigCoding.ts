import {
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_ROSENZWEIG_CODING,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiFetchChatCompletions,
  openAiRequestHeaders,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import { ROSENZWEIG_SITUATIONS } from "@/lib/attestation/attestationQuestions";
import type {
  RosenzweigCodingMap,
  RosenzweigDirection,
  RosenzweigReaction,
} from "@/lib/attestation/rosenzweigCoding";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

type CodingItemJson = {
  id?: string;
  direction?: string;
  reaction?: string;
  confidence?: string;
};

type CodingResponseJson = {
  items?: CodingItemJson[];
};

export type GenerateRosenzweigCodingResult = {
  coding: RosenzweigCodingMap;
  codedCount: number;
  ok: boolean;
};

const DIRECTIONS = new Set<RosenzweigDirection>(["E", "I", "M"]);
const REACTIONS = new Set<RosenzweigReaction>(["OD", "ED", "NP"]);

/**
 * Запрашивает у OpenAI кодирование ответов Розенцвейга (E/I/M × OD/ED/NP).
 */
export async function generateRosenzweigCoding(input: {
  rosenzweigContext: string;
  sessionRef: string;
}): Promise<GenerateRosenzweigCodingResult> {
  const empty: GenerateRosenzweigCodingResult = { coding: {}, codedCount: 0, ok: false };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    screeningServerLog("openai_rosenzweig", "skipped_no_api_key", {
      sessionRef: input.sessionRef,
    });
    return empty;
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
          temperature: 0.1,
          reasoningEffort: "low",
          maxCompletionTokens: 4000,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_ROSENZWEIG_CODING },
            {
              role: "user",
              content: JSON.stringify({ rosenzweigContext: input.rosenzweigContext }),
            },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_rosenzweig", "fetch_network_error", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return empty;
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_rosenzweig", "http_error", {
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
    screeningServerLog("openai_rosenzweig", "empty_choices", {
      sessionRef: input.sessionRef,
      model,
      durationMs: Date.now() - fetchStarted,
    });
    return empty;
  }

  let parsed: CodingResponseJson;
  try {
    parsed = JSON.parse(text) as CodingResponseJson;
  } catch {
    screeningServerLog("openai_rosenzweig", "json_parse_failed", {
      sessionRef: input.sessionRef,
      model,
      responseChars: text.length,
    });
    return empty;
  }

  const coding = _parseCodingItems(parsed.items ?? []);
  const codedCount = Object.keys(coding).length;
  const ok = codedCount > 0;

  screeningServerLog("openai_rosenzweig", ok ? "success" : "empty_coding", {
    sessionRef: input.sessionRef,
    model,
    codedCount,
    expected: ROSENZWEIG_SITUATIONS.length,
    durationMs: Date.now() - fetchStarted,
  });

  return { coding, codedCount, ok };
}

function _parseCodingItems(items: ReadonlyArray<CodingItemJson>): RosenzweigCodingMap {
  const allowedIds = new Set(ROSENZWEIG_SITUATIONS.map((s) => s.id));
  const coding: RosenzweigCodingMap = {};

  for (const item of items) {
    if (!item.id || !allowedIds.has(item.id)) {
      continue;
    }
    const direction = item.direction as RosenzweigDirection | undefined;
    const reaction = item.reaction as RosenzweigReaction | undefined;
    if (!direction || !DIRECTIONS.has(direction)) {
      continue;
    }
    if (!reaction || !REACTIONS.has(reaction)) {
      continue;
    }
    coding[item.id] = { direction, reaction };
  }

  return coding;
}
