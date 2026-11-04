import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";
import type { SurveySettingsDocument } from "@/lib/survey/surveyTypes";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ surveyId: string }> };

function parseSettings(raw: unknown): SurveySettingsDocument {
  return raw as SurveySettingsDocument;
}

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId } = await context.params;
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: {
      status: true,
      currentVersion: { select: { settings: true } },
      draftVersion: { select: { settings: true } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
  }

  const settingsRaw =
    survey.status === "published" && survey.currentVersion
      ? survey.currentVersion.settings
      : survey.draftVersion?.settings;
  if (!settingsRaw) {
    return NextResponse.json({ enabled: false, token: null, published: survey.status === "published" });
  }

  const settings = parseSettings(settingsRaw);
  return NextResponse.json({
    enabled: settings.publicLinkEnabled === true,
    token: settings.publicLinkToken ?? null,
    published: survey.status === "published",
  });
}
