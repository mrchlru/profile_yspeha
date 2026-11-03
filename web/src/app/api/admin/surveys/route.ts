import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { createSurveyAdmin, listSurveysAdmin } from "@/lib/survey/surveyAdminService";
import type { SurveyMode, SurveyStatus } from "@/lib/survey/surveyTypes";

export const dynamic = "force-dynamic";

const createBodySchema = z
  .object({
    mode: z.enum(["survey", "test"]).default("survey"),
    title: z.string().trim().max(300).optional(),
  })
  .strict();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = req.nextUrl.searchParams;
  const status = (params.get("status") ?? "all") as SurveyStatus | "all";
  const mode = (params.get("mode") ?? "all") as SurveyMode | "all";
  const search = params.get("search") ?? undefined;

  const items = await listSurveysAdmin({ status, mode, search });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const created = await createSurveyAdmin({
    mode: parsed.data.mode,
    title: parsed.data.title,
    createdByEmail: auth.user.email,
  });

  return NextResponse.json({ surveyId: created.surveyId });
}
