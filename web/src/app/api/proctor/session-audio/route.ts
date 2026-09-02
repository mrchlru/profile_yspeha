import { NextRequest, NextResponse } from "next/server";

import { requireProctorAccess } from "@/lib/proctor/requireProctorAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_SESSION_AUDIO_BYTES = 12 * 1024 * 1024;

/**
 * Загружает или обновляет непрерывную аудиозапись сессии прокторинга.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const accessCode = String(formData.get("accessCode") ?? "").trim();
  const durationMsRaw = String(formData.get("durationMs") ?? "").trim();
  const isFinal = String(formData.get("final") ?? "") === "1";
  const file = formData.get("audio");

  if (!sessionId || !accessCode || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const access = await requireProctorAccess(sessionId, accessCode);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const proctorSession = await prisma.proctorSession.upsert({
    where: { sessionId },
    create: {
      sessionId,
      accessCode,
      candidateFolderKey: access.candidateFolderKey,
      testKind: access.testKind,
    },
    update: {},
    select: { id: true },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_SESSION_AUDIO_BYTES) {
    return NextResponse.json({ error: "Недопустимый размер аудио" }, { status: 400 });
  }

  const durationMs = durationMsRaw ? Number.parseInt(durationMsRaw, 10) : null;
  const mimeType = file.type || "audio/webm";

  await prisma.proctorSessionAudio.upsert({
    where: { proctorSessionId: proctorSession.id },
    create: {
      proctorSessionId: proctorSession.id,
      mimeType,
      durationMs: Number.isFinite(durationMs) ? durationMs : null,
      sizeBytes: buffer.length,
      data: buffer,
      isFinal,
    },
    update: {
      mimeType,
      durationMs: Number.isFinite(durationMs) ? durationMs : null,
      sizeBytes: buffer.length,
      data: buffer,
      isFinal: isFinal ? true : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
