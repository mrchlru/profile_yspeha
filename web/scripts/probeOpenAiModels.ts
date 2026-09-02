/**
 * Диагностика OpenAI: какая модель и параметры работают на проде.
 *
 *   railway run -- npx tsx scripts/probeOpenAiModels.ts
 */
import "dotenv/config";
import {
  buildOpenAiChatRequestBody,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiManagerBriefChatModel,
} from "../src/lib/ai/openaiHttp";
import { OPENAI_JSON_RESPONSE_FORMAT } from "../src/lib/ai/openaiPromptPolicy";

type ProbeCase = {
  label: string;
  model: string;
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
  maxCompletionTokens: number;
  temperature?: number;
};

const PROBES: ReadonlyArray<ProbeCase> = [
  {
    label: "env_manager_brief_default",
    model: resolveOpenAiManagerBriefChatModel(),
    reasoningEffort: "medium",
    maxCompletionTokens: 900,
    temperature: 0.35,
  },
  {
    label: "env_low_tokens_2400",
    model: resolveOpenAiManagerBriefChatModel(),
    reasoningEffort: "low",
    maxCompletionTokens: 2400,
    temperature: 0.35,
  },
  {
    label: "gpt-4o-mini",
    model: "gpt-4o-mini",
    maxCompletionTokens: 900,
    temperature: 0.35,
  },
  {
    label: "gpt-4o",
    model: "gpt-4o",
    maxCompletionTokens: 900,
    temperature: 0.35,
  },
];

async function probeOne(apiKey: string, probe: ProbeCase): Promise<void> {
  const body = buildOpenAiChatRequestBody({
    model: probe.model,
    temperature: probe.temperature,
    reasoningEffort: probe.reasoningEffort,
    maxCompletionTokens: probe.maxCompletionTokens,
    responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
    messages: [
      { role: "system", content: "Ответь JSON: { \"conclusion\": \"тест ok\" }" },
      { role: "user", content: JSON.stringify({ ping: true }) },
    ],
  });

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(openAiChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.log(
      JSON.stringify({
        probe: probe.label,
        model: probe.model,
        ok: false,
        networkError: err instanceof Error ? err.message : String(err),
      })
    );
    return;
  }

  const durationMs = Date.now() - started;
  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    console.log(
      JSON.stringify({
        probe: probe.label,
        model: probe.model,
        ok: false,
        status: res.status,
        durationMs,
        bodySnippet,
        requestBodyKeys: Object.keys(body),
      })
    );
    return;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  console.log(
    JSON.stringify({
      probe: probe.label,
      model: probe.model,
      ok: true,
      durationMs,
      contentPreview: content.slice(0, 120),
    })
  );
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY не задан");
  }
  console.log("baseUrl", process.env.OPENAI_BASE_URL ?? "https://api.openai.com");
  console.log("OPENAI_MODEL", process.env.OPENAI_MODEL ?? "(default)");
  console.log("OPENAI_MANAGER_BRIEF_MODEL", process.env.OPENAI_MANAGER_BRIEF_MODEL ?? "(default)");
  for (const probe of PROBES) {
    await probeOne(apiKey, probe);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
