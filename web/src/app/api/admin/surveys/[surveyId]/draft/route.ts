import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { parseSurveyDraftBody } from "@/lib/survey/parseSurveyDraftBody";
import { getSurveyDraftAdmin, updateSurveyDraftAdmin } from "@/lib/survey/surveyAdminService";
import type { SurveySchemaDocument, SurveySettingsDocument } from "@/lib/survey/surveyTypes";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ surveyId: string }> };

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId } = await context.params;
  const draft = await getSurveyDraftAdmin(surveyId);
  if (!draft) {
    return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
  }
  return NextResponse.json(draft);
}

export async function PUT(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId } = await context.params;
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = parseSurveyDraftBody(jsonBody);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await updateSurveyDraftAdmin(surveyId, {
    schema: parsed.schema as SurveySchemaDocument,
    settings: parsed.settings as SurveySettingsDocument,
    revision: parsed.revision,
  });

  if (!result.ok) {
    if (result.reason === "conflict") {
      return NextResponse.json(
        { error: "Опрос изменён другим пользователем. Загрузите свежую версию." },
        { status: 409 }
      );
    }
    if (result.reason === "archived") {
      return NextResponse.json({ error: "Архивный опрос нельзя редактировать" }, { status: 403 });
    }
    return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
  }

  return NextResponse.json({ revision: result.revision });
}
