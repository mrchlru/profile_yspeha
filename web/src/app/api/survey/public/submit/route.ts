import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { submitSurveyPublicPlay } from "@/lib/survey/surveyPlayService";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    token: z.string().min(16).max(80),
    responseId: z.string().min(1).max(80),
    answers: z.array(
      z.object({
        questionId: z.string().min(1).max(120),
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

  const result = await submitSurveyPublicPlay(parsed.data);
  if (!result.ok) {
    const status = result.reason === "conflict" ? 409 : 404;
    return NextResponse.json({ error: "Не удалось отправить ответы" }, { status });
  }

  return NextResponse.json({ ok: true });
}
