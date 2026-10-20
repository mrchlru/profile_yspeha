import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { assertAttestationSessionInFolder } from "@/lib/admin/buildAttestationReportView";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { persistAttestationBriefReport } from "@/lib/attestation/persistAttestationBriefReport";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  folderKey: z.string().min(1).max(300),
  sessionId: z.string().min(1).max(120),
});

export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: boolean; error?: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }

  const { folderKey, sessionId } = parsed.data;
  const allowed = await assertAttestationSessionInFolder(folderKey, sessionId);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Сессия не найдена в папке" }, { status: 404 });
  }

  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: { firstName: true, lastName: true },
  });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Сессия не найдена" }, { status: 404 });
  }

  const personName = `${row.lastName} ${row.firstName}`.trim();
  const result = await persistAttestationBriefReport({
    sessionId,
    sessionRef: shortSessionRef(sessionId),
    personName,
  });

  if (!result.aiGenerated) {
    return NextResponse.json(
      { ok: false, error: "Не удалось сгенерировать краткий отчёт (ИИ)" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
