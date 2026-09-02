/**
 * Диагностика вызова OpenAI для audit HR synthesis.
 * npx tsx scripts/testAuditOpenAi.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

import { OPENAI_AUDIT_HR_RESPONSE_FORMAT } from "../src/lib/ai/audit/auditConclusionJsonSchema";
import { buildAuditAiPipelinePayload } from "../src/lib/ai/audit/buildAuditAiPipelinePayload";
import { OPENAI_SYSTEM_PROMPT_AUDIT_HR_SYNTHESIS } from "../src/lib/ai/openaiPromptPolicy";
import {
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "../src/lib/ai/openaiHttp";
import { buildAuditReportJson } from "../src/lib/audit/report/buildAuditReportData";
import { parseAuditAnswersPayload } from "../src/lib/audit/report/parseAuditAnswersPayload";

config({ path: resolve(process.cwd(), ".env") });

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY не задан в .env");
    process.exit(1);
  }

  const model = resolveOpenAiChatModel();
  const answers = parseAuditAnswersPayload({});
  const report = buildAuditReportJson({
    answers,
    previous: null,
    aiDraft: {
      conclusion: null,
      yearOverYearDynamics: null,
      generatedAt: null,
      structured: null,
    },
    deliveryDraft: { emailSent: false, pdfGenerated: false },
  });

  const payload = buildAuditAiPipelinePayload({
    fullName: "Автотестов Иван",
    sessionId: "diag-session",
    assesseeKey: "test-key",
    answers,
    report,
  });

  const userMessage = JSON.stringify({
    participant: payload.participant,
    normalizedSignals: payload.signals,
    riskProfile: payload.riskProfile,
    interpretationHints: payload.interpretationHints,
    methodologyWeights: payload.methodologyWeights,
    yearOverYear: { status: "no_previous_wave" },
  });

  const bodyWithTemp = {
    model,
    temperature: 0.3,
    max_completion_tokens: 24000,
    reasoning_effort: "low",
    response_format: OPENAI_AUDIT_HR_RESPONSE_FORMAT,
    messages: [
      { role: "system", content: OPENAI_SYSTEM_PROMPT_AUDIT_HR_SYNTHESIS },
      { role: "user", content: userMessage },
    ],
  };

  const bodyNoTemp = {
    model,
    max_completion_tokens: 24000,
    reasoning_effort: "low",
    response_format: OPENAI_AUDIT_HR_RESPONSE_FORMAT,
    messages: bodyWithTemp.messages,
  };

  for (const [label, body] of [
    ["with temperature", bodyWithTemp],
    ["without temperature", bodyNoTemp],
  ] as const) {
    console.log(`\n=== ${label} ===`);
    const res = await fetch(openAiChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    console.log("HTTP", res.status);
    if (!res.ok) {
      console.log(await readResponseBodySnippet(res, 2000));
      continue;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    console.log("content chars:", text.length);
    console.log("preview:", text.slice(0, 200));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
