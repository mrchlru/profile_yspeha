import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ surveyId: string }> };

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId } = await context.params;
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, title: true },
  });
  if (!survey) {
    return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
  }

  const rows = await prisma.surveyResponse.findMany({
    where: { surveyId, status: "submitted" },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      submittedAt: true,
      accessInviteCode: true,
      status: true,
      _count: { select: { answers: true } },
    },
  });

  return NextResponse.json({
    survey,
    items: rows.map((row) => ({
      id: row.id,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      accessInviteCode: row.accessInviteCode,
      answerCount: row._count.answers,
      status: row.status,
    })),
  });
}
