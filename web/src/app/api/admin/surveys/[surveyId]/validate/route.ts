import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { getSurveyDraftAdmin } from "@/lib/survey/surveyAdminService";
import { validateSurveyDraft } from "@/lib/survey/validateSurveyDraft";
import type { SurveyMode } from "@/lib/survey/surveyTypes";

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
  const draft = await getSurveyDraftAdmin(surveyId);
  if (!draft) {
    return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
  }

  const result = validateSurveyDraft({
    mode: draft.mode as SurveyMode,
    schema: draft.schema,
    settings: draft.settings,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, issues: result.issues });
  }
  return NextResponse.json({ ok: true });
}
