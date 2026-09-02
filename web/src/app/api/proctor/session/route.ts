import { NextRequest, NextResponse } from "next/server";

import { normalizeAccessCode } from "@/lib/access/accessCode";
import { proctorSessionBodySchema } from "@/lib/proctor/proctorValidation";
import { requireProctorAccess } from "@/lib/proctor/requireProctorAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Регистрирует или обновляет сессию прокторинга.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = proctorSessionBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const { sessionId, accessCode } = parsed.data;
  const access = await requireProctorAccess(sessionId, accessCode);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await prisma.proctorSession.upsert({
    where: { sessionId },
    create: {
      sessionId,
      accessCode: normalizeAccessCode(accessCode),
      candidateFolderKey: access.candidateFolderKey,
      testKind: access.testKind,
    },
    update: {
      candidateFolderKey: access.candidateFolderKey ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
