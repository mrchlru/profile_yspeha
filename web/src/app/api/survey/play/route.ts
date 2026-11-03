import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loadSurveyPlayByAccessCode } from "@/lib/survey/surveyPlayService";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ code: z.string().min(8).max(80) }).strict();

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

  const result = await loadSurveyPlayByAccessCode(parsed.data.code);
  if (!result.ok) {
    return NextResponse.json({ error: "Код недействителен для опроса" }, { status: 404 });
  }

  return NextResponse.json({
    surveyId: result.payload.surveyId,
    surveyVersionId: result.payload.surveyVersionId,
    title: result.payload.title,
    mode: result.payload.mode,
    schema: result.payload.schema,
    settings: result.payload.settings,
    responseId: result.payload.responseId,
  });
}
