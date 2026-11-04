import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loadSurveyPublicPreview } from "@/lib/survey/surveyPlayService";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().min(16).max(80) }).strict();

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

  const result = await loadSurveyPublicPreview(parsed.data.token);
  if (!result.ok) {
    return NextResponse.json({ error: "Ссылка недействительна" }, { status: 404 });
  }

  return NextResponse.json(result.payload);
}
