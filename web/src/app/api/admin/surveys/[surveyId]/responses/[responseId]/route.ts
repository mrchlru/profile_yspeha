import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";
import type { SurveySchemaDocument } from "@/lib/survey/surveyTypes";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ surveyId: string; responseId: string }> };

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId, responseId } = await context.params;

  const response = await prisma.surveyResponse.findFirst({
    where: { id: responseId, surveyId },
    select: {
      id: true,
      submittedAt: true,
      accessInviteCode: true,
      source: true,
      status: true,
      answers: {
        select: { questionId: true, value: true },
        orderBy: { createdAt: "asc" },
      },
      surveyVersion: { select: { schema: true } },
      survey: { select: { title: true } },
    },
  });

  if (!response) {
    return NextResponse.json({ error: "Ответ не найден" }, { status: 404 });
  }

  const schema = response.surveyVersion.schema as SurveySchemaDocument;

  return NextResponse.json({
    surveyTitle: response.survey.title,
    response: {
      id: response.id,
      submittedAt: response.submittedAt?.toISOString() ?? null,
      accessInviteCode: response.accessInviteCode,
      source: response.source,
      status: response.status,
    },
    schema,
    answers: response.answers,
  });
}
