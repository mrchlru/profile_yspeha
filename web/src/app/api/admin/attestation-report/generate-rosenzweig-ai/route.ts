import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  assertAttestationSessionInFolder,
  buildAttestationReportView,
} from "@/lib/admin/buildAttestationReportView";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { persistAttestationAiConclusion } from "@/lib/attestation/persistAttestationAiConclusion";
import { persistRosenzweigAiCoding } from "@/lib/attestation/persistRosenzweigAiCoding";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const bodySchema = z.object({
  folderKey: z.string().min(1).max(300),
  sessionId: z.string().min(1).max(120),
  /** Перезаписать существующее кодирование. */
  force: z.boolean().optional(),
});

/**
 * Запускает ИИ-кодирование Розенцвейга и перегенерирует заключение по аттестации.
 */
export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | { ok: true; view: NonNullable<Awaited<ReturnType<typeof buildAttestationReportView>>> }
    | { ok: true }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const { folderKey, sessionId } = parsed.data;
  const force = parsed.data.force !== false;
  const allowed = await assertAttestationSessionInFolder(folderKey, sessionId);
  if (!allowed) {
    return NextResponse.json({ error: "Отчёт не найден в этой папке" }, { status: 404 });
  }

  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: { firstName: true, lastName: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
  }

  const sessionRef = shortSessionRef(sessionId);
  const personName = `${row.lastName} ${row.firstName}`.trim();

  let codingOk = false;
  try {
    const codingResult = await persistRosenzweigAiCoding({
      sessionId,
      sessionRef,
      personName,
      force,
    });
    codingOk = codingResult.aiGenerated || codingResult.skippedExisting;
    if (!codingResult.aiGenerated && !codingResult.skippedExisting) {
      return NextResponse.json(
        {
          error:
            "Модель не вернула кодирование. Проверьте OPENAI_API_KEY и повторите.",
        },
        { status: 502 }
      );
    }
  } catch (err) {
    screeningServerLog("admin_attestation_rosenzweig_ai", "coding_failed", {
      sessionId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Не удалось выполнить ИИ-кодирование" }, { status: 500 });
  }

  try {
    await persistAttestationAiConclusion({ sessionId, sessionRef, personName });
  } catch (err) {
    screeningServerLog("admin_attestation_rosenzweig_ai", "conclusion_failed", {
      sessionId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    // Кодирование уже сохранено — возвращаем view, заключение можно перегенерировать отдельно.
  }

  const view = await buildAttestationReportView(sessionId);
  screeningServerLog("admin_attestation_rosenzweig_ai", "ok", {
    sessionId,
    codingOk,
  });
  if (!view) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, view });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
