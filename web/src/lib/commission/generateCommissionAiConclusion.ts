import {
  OPENAI_JSON_RESPONSE_FORMAT,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiRequestHeaders,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import type { CommissionAggregateReportData } from "@/lib/commission/buildCommissionAggregateReport";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

const SYSTEM_PROMPT = `Ты HR-аналитик. На вход — сводные оценки комиссии по кандидату: шкала 1–10 по фиксированным вопросам и развёрнутые заключения членов комиссии.

Сформируй краткое практичное заключение для руководителя и HR (4–8 предложений): сильные стороны, риски, рекомендация по найму. Опирайся только на данные. Тон деловой, без воды.

Ответ — JSON: { "conclusion": "текст на русском" }`;

/**
 * Генерирует ИИ-заключение по сводным данным комиссии.
 */
export async function generateCommissionAiConclusion(
  reportData: CommissionAggregateReportData
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = resolveOpenAiChatModel();
  const userPayload = {
    candidateName: reportData.candidateName,
    vacancyTitle: reportData.vacancyTitle,
    scaleMatrix: reportData.scaleMatrix,
    variableBlocks: reportData.variableBlocks,
    overallScaleAverage: reportData.overallScaleAverage,
  };

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
          maxCompletionTokens: 2000,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        })
      ),
    });
  } catch {
    return null;
  }

  if (!res.ok) {
    await readResponseBodySnippet(res);
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as { conclusion?: string };
    return parsed.conclusion?.trim() || null;
  } catch {
    screeningServerLog("openai_commission_conclusion", "parse_error", {});
    return null;
  }
}
