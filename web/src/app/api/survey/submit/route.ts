import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { submitSurveyPlay } from "@/lib/survey/surveyPlayService";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    code: z.string().min(8).max(80),
    responseId: z.string().min(1),
    answers: z.array(
      z.object({
        questionId: z.string().min(1),
        value: z.unknown(),
      })
    ),
  })
  .strict();

export async function POST(req: NextRequest): Promise<NextResponse> {
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const result = await submitSurveyPlay(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: "Не удалось отправить ответы" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
