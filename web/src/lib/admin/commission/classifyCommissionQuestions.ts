import {
  OPENAI_JSON_RESPONSE_FORMAT,
  OPENAI_SYSTEM_PROMPT_COMMISSION_CLASSIFY,
} from "@/lib/ai/openaiPromptPolicy";
import {
  buildOpenAiChatRequestBody,
  openAiRequestHeaders,
  openAiChatCompletionsUrl,
  readResponseBodySnippet,
  resolveOpenAiChatModel,
} from "@/lib/ai/openaiHttp";
import {
  CANDIDATE_POSITION_LEVEL_OPTIONS,
} from "@/lib/admin/candidatePositionLevels";
import {
  COMMISSION_QUESTION_CATEGORIES,
  COMMISSION_SPECIALTY_OPTIONS,
  type ClassifiedCommissionQuestionDraft,
  type CommissionQuestionCategoryId,
  isCommissionQuestionCategory,
  normalizeCommissionPositionLevels,
  normalizeCommissionSpecialties,
} from "@/lib/admin/commission/commissionQuestionTypes";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

type ClassifyCommissionQuestionsInput = {
  questions: ReadonlyArray<string>;
  contextPositionLevel?: string;
  contextSpecialty?: string;
  /** Название должности / вакансии без даты (из папки собеседования). */
  contextPositionTitle?: string;
};

type RawAiItem = {
  text?: string;
  category?: string;
  positionLevels?: string[];
  specialties?: string[];
  rationale?: string;
};

/**
 * Классифицирует пакет вопросов комиссии с помощью OpenAI.
 */
export async function classifyCommissionQuestionsWithAi(
  input: ClassifyCommissionQuestionsInput
): Promise<ClassifiedCommissionQuestionDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    throw new Error("OpenAI API key не настроен. Классификация недоступна.");
  }

  if (input.questions.length === 0) {
    return [];
  }

  const model = resolveOpenAiChatModel();
  const userPayload = {
    questions: input.questions,
    categoryIds: COMMISSION_QUESTION_CATEGORIES.map((item) => ({
      id: item.id,
      label: item.label,
    })),
    positionLevelIds: CANDIDATE_POSITION_LEVEL_OPTIONS.map((item) => ({
      id: item.value,
      label: item.label,
    })),
    specialtyIds: COMMISSION_SPECIALTY_OPTIONS.map((item) => ({
      id: item.value,
      label: item.label,
    })),
    context: {
      positionLevel: input.contextPositionLevel ?? null,
      specialty: input.contextSpecialty ?? null,
      positionTitle: input.contextPositionTitle ?? null,
    },
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
          temperature: 0.2,
          reasoningEffort: "low",
          maxCompletionTokens: 12000,
          responseFormat: OPENAI_JSON_RESPONSE_FORMAT,
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT_COMMISSION_CLASSIFY },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        })
      ),
    });
  } catch (err) {
    screeningServerLog("openai_commission", "fetch_network_error", {
      model,
      durationMs: Date.now() - fetchStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    throw new Error("Сеть недоступна при обращении к OpenAI.");
  }

  if (!res.ok) {
    const bodySnippet = await readResponseBodySnippet(res);
    screeningServerLog("openai_commission", "http_error", {
      model,
      status: res.status,
      durationMs: Date.now() - fetchStarted,
      bodySnippet,
    });
    throw new Error("OpenAI вернул ошибку при классификации вопросов.");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("Пустой ответ модели при классификации.");
  }

  let parsed: { items?: RawAiItem[] };
  try {
    parsed = JSON.parse(text) as { items?: RawAiItem[] };
  } catch {
    throw new Error("Модель вернула некорректный JSON.");
  }

  return _normalizeAiItems(parsed.items ?? [], input.questions);
}

function _normalizeAiItems(
  items: RawAiItem[],
  sourceQuestions: ReadonlyArray<string>
): ClassifiedCommissionQuestionDraft[] {
  const sourceSet = new Set(sourceQuestions.map((q) => q.trim()));
  const used = new Set<string>();
  const result: ClassifiedCommissionQuestionDraft[] = [];

  for (const item of items) {
    const text = item.text?.trim();
    if (!text || text.length < 8 || !sourceSet.has(text) || used.has(text)) {
      continue;
    }
    used.add(text);

    const rawCategory = item.category ?? "";
    const category: CommissionQuestionCategoryId = isCommissionQuestionCategory(rawCategory)
      ? rawCategory
      : "other";
    const positionLevels = normalizeCommissionPositionLevels(item.positionLevels ?? []);
    const specialties = normalizeCommissionSpecialties(item.specialties ?? []);

    result.push({
      text,
      category,
      positionLevels,
      specialties,
      rationale: item.rationale?.trim() || null,
    });
  }

  for (const question of sourceQuestions) {
    if (used.has(question)) {
      continue;
    }
    result.push({
      text: question,
      category: "other",
      positionLevels: [],
      specialties: ["universal"],
      rationale: "Не удалось классифицировать автоматически — проверьте вручную.",
    });
  }

  return result;
}
