import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { publishSurveyAdmin } from "@/lib/survey/surveyAdminService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ surveyId: string }> };

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId } = await context.params;
  const result = await publishSurveyAdmin(surveyId, auth.user.email);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
    }
    if (result.reason === "archived") {
      return NextResponse.json({ error: "Опрос в архиве" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Исправьте ошибки перед публикацией", issues: result.issues ?? [] },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, versionNumber: result.versionNumber });
}
