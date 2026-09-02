import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { classifyCommissionQuestionsWithAi } from "@/lib/admin/commission/classifyCommissionQuestions";
import { parseBulkCommissionQuestionText } from "@/lib/admin/commission/parseBulkCommissionQuestions";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  rawText: z.string().min(8).max(50000),
  contextPositionLevel: z.string().trim().min(1).max(80).optional(),
  contextSpecialty: z.string().trim().min(1).max(80).optional(),
});

/**
 * Разбирает массовый ввод и классифицирует вопросы с помощью ИИ.
 */
export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        drafts: Awaited<ReturnType<typeof classifyCommissionQuestionsWithAi>>;
        parsedCount: number;
      }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const questions = parseBulkCommissionQuestionText(parsed.data.rawText);
  if (questions.length === 0) {
    return NextResponse.json({ error: "Не найдено вопросов для разбора." }, { status: 400 });
  }
  if (questions.length > 80) {
    return NextResponse.json({ error: "За один раз можно разобрать не более 80 вопросов." }, { status: 400 });
  }

  try {
    const drafts = await classifyCommissionQuestionsWithAi({
      questions,
      contextPositionLevel: parsed.data.contextPositionLevel,
      contextSpecialty: parsed.data.contextSpecialty,
    });
    return NextResponse.json({ drafts, parsedCount: questions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось классифицировать вопросы";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
