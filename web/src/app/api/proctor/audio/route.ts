import { NextRequest, NextResponse } from "next/server";

import { requireProctorAccess } from "@/lib/proctor/requireProctorAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/**
 * Загружает аудиофрагмент (webm/opus) для звукового нарушения.
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
  const serverEventId = String(formData.get("serverEventId") ?? "").trim();
  const durationMsRaw = String(formData.get("durationMs") ?? "").trim();
  const file = formData.get("audio");

  if (!sessionId || !accessCode || !serverEventId || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const access = await requireProctorAccess(sessionId, accessCode);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const event = await prisma.proctorEvent.findUnique({
    where: { id: serverEventId },
    select: {
      id: true,
      audioClip: { select: { id: true } },
      proctorSession: { select: { sessionId: true } },
    },
  });

  if (
    event === null ||
    event.proctorSession.sessionId !== sessionId ||
    event.audioClip !== null
  ) {
    return NextResponse.json({ error: "Событие не найдено" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Недопустимый размер аудио" }, { status: 400 });
  }

  const durationMs = durationMsRaw ? Number.parseInt(durationMsRaw, 10) : null;

  await prisma.proctorAudioClip.create({
    data: {
      eventId: event.id,
      mimeType: file.type || "audio/webm",
      durationMs: Number.isFinite(durationMs) ? durationMs : null,
      sizeBytes: buffer.length,
      data: buffer,
    },
  });

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
