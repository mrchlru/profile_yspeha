import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { duplicateSurveyAdmin } from "@/lib/survey/surveyAdminService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ surveyId: string }> };

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId } = await context.params;
  const created = await duplicateSurveyAdmin(surveyId, auth.user.email);
  if (!created) {
    return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
  }
  return NextResponse.json(created);
}
