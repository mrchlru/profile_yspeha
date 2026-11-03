import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateAccessCode } from "@/lib/access/accessCode";
import { inviteExpiresAtFrom } from "@/lib/access/inviteValidity";
import { TEST_KIND_CUSTOM_SURVEY } from "@/lib/access/testKinds";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    existingFolderKey: z.string().trim().min(1).max(300).optional(),
    devMode: z.boolean().optional(),
    avProctorDisabled: z.boolean().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ surveyId: string }> };

const MAX_GENERATE_ATTEMPTS = 8;

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { surveyId } = await context.params;

  let jsonBody: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      jsonBody = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, status: true, currentVersionId: true, title: true },
  });
  if (!survey?.currentVersionId || survey.status !== "published") {
    return NextResponse.json(
      { error: "Сначала опубликуйте опрос — выдавать можно только опубликованную версию." },
      { status: 422 }
    );
  }

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt += 1) {
    const code = generateAccessCode();
    const createdAt = new Date();
    const expiresAt = inviteExpiresAtFrom(createdAt);
    try {
      const row = await prisma.accessInvite.create({
        data: {
          code,
          testKind: TEST_KIND_CUSTOM_SURVEY,
          expiresAt,
          surveyVersionId: survey.currentVersionId,
          devMode: parsed.data.devMode === true,
          avProctorDisabled: parsed.data.avProctorDisabled === true,
          candidateFolderKey: parsed.data.existingFolderKey ?? null,
        },
        select: { code: true, expiresAt: true },
      });
      return NextResponse.json({
        code: row.code,
        testKind: TEST_KIND_CUSTOM_SURVEY,
        expiresAt: row.expiresAt.toISOString(),
        surveyId: survey.id,
        surveyTitle: survey.title,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Не удалось создать код" }, { status: 500 });
}
