import {
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_COMMISSION_QUESTION_FILTER,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiRequestHeaders,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type CommissionMemberQuestionFilterResult = {
  text: string;
  allowed: boolean;
  reason: string | null;
};

type RawFilterItem = {
  text?: string;
  allowed?: boolean;
  reason?: string;
};

/**
 * Проверяет пользовательские вопросы комиссии на уместность для должности.
 */
export async function filterCommissionMemberQuestionsWithAi(input: {
  questions: ReadonlyArray<string>;
  positionTitle: string;
}): Promise<CommissionMemberQuestionFilterResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    throw new Error("OpenAI API key не настроен. Проверка вопросов недоступна.");
  }

  const positionTitle = input.positionTitle.trim();
  if (positionTitle.length === 0) {
    throw new Error("Не указана должность для проверки вопроса.");
  }

  const questions = input.questions.map((item) => item.trim()).filter((item) => item.length >= 5);
  if (questions.length === 0) {
    return [];
  }

  const model = resolveOpenAiChatModel();
  const fetchStarted = Date.now();
  let res: Response;
  try {
    res = await fetch(openAiChatCompletionsUrl(), {
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
            { role: "system", content: OPENAI_SYSTEM_PROMPT_COMMISSION_QUESTION_FILTER },
            {
              role: "user",
              content: JSON.stringify({
                positionTitle,
                questions,
              }),
            },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_commission_filter", "fetch_network_error", {
      model,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    throw new Error("Сеть недоступна при проверке вопроса.");
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_commission_filter", "http_error", {
      model,
      status: res.status,
      durationMs: Date.now() - fetchStarted,
      bodySnippet,
    });
    throw new Error("OpenAI вернул ошибку при проверке вопроса.");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("Пустой ответ модели при проверке вопроса.");
  }

  let parsed: { items?: RawFilterItem[] };
  try {
    parsed = JSON.parse(text) as { items?: RawFilterItem[] };
  } catch {
    throw new Error("Модель вернула некорректный JSON при проверке вопроса.");
  }

  return _normalizeFilterItems(parsed.items ?? [], questions);
}

function _normalizeFilterItems(
  items: RawFilterItem[],
  sourceQuestions: ReadonlyArray<string>
): CommissionMemberQuestionFilterResult[] {
  const sourceSet = new Set(sourceQuestions.map((item) => item.trim()));
  const byText = new Map<string, CommissionMemberQuestionFilterResult>();

  for (const item of items) {
    const text = item.text?.trim();
    if (!text || !sourceSet.has(text)) {
      continue;
    }
    byText.set(text, {
      text,
      allowed: item.allowed === true,
      reason: item.reason?.trim() || null,
    });
  }

  return sourceQuestions.map((text) => {
    const existing = byText.get(text);
    if (existing) {
      return existing;
    }
    return {
      text,
      allowed: false,
      reason: "Не удалось автоматически проверить вопрос. Переформулируйте его под должность.",
    };
  });
}
