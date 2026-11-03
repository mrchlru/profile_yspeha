import { z } from "zod";

const draftBodySchema = z
  .object({
    schema: z.record(z.string(), z.unknown()),
    settings: z.record(z.string(), z.unknown()),
    revision: z.number().int().positive(),
  })
  .strict();

export type ParsedSurveyDraftBody = z.infer<typeof draftBodySchema>;

/**
 * Парсит тело PUT черновика опроса.
 */
export function parseSurveyDraftBody(
  json: unknown
): ParsedSurveyDraftBody | { error: string } {
  const parsed = draftBodySchema.safeParse(json);
  if (!parsed.success) {
    return { error: "Некорректные данные черновика" };
  }
  return parsed.data;
}
