import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { isProctorEventKind, PROCTOR_EVENT_PHONE_DETECTED } from "@/lib/proctor/proctorEventKinds";
import { requireProctorAccess } from "@/lib/proctor/requireProctorAccess";
import { verifyDisputedSnapshot } from "@/lib/proctor/verifyDisputedSnapshot";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SNAPSHOT_BYTES = 512 * 1024;

/**
 * Загружает JPEG-кадр для видеонарушения и запускает серверную перепроверку.
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
  const widthRaw = String(formData.get("width") ?? "").trim();
  const heightRaw = String(formData.get("height") ?? "").trim();
  const file = formData.get("snapshot");

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
      kind: true,
      occurredAt: true,
      clientFaceCount: true,
      proctorSession: { select: { id: true, sessionId: true } },
      snapshot: { select: { id: true } },
    },
  });

  if (
    event === null ||
    event.proctorSession.sessionId !== sessionId ||
    event.snapshot !== null
  ) {
    return NextResponse.json({ error: "Событие не найдено" }, { status: 404 });
  }

  if (!isProctorEventKind(event.kind)) {
    return NextResponse.json({ error: "Некорректный тип события" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json({ error: "Недопустимый размер снимка" }, { status: 400 });
  }

  const width = widthRaw ? Number.parseInt(widthRaw, 10) : null;
  const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;

  const verification = await verifyDisputedSnapshot(buffer, event.kind, event.clientFaceCount);

  const metadata = verification
    ? ({
        serverMethod: verification.method,
        serverPersonCount: verification.serverPersonCount,
        serverPhoneCount: verification.serverPhoneCount,
        detections: verification.detections ?? [],
      } as Prisma.InputJsonValue)
    : undefined;

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.proctorSnapshot.create({
      data: {
        eventId: event.id,
        mimeType: file.type || "image/jpeg",
        width: Number.isFinite(width) ? width : null,
        height: Number.isFinite(height) ? height : null,
        sizeBytes: buffer.length,
        data: buffer,
      },
    }),
    prisma.proctorEvent.update({
      where: { id: event.id },
      data: {
        serverFaceCount: verification?.serverFaceCount ?? null,
        serverVerified: verification?.serverVerified ?? null,
        metadata,
      },
    }),
  ];

  if (verification && verification.serverPhoneCount > 0) {
    operations.push(
      prisma.proctorEvent.create({
        data: {
          proctorSessionId: event.proctorSession.id,
          kind: PROCTOR_EVENT_PHONE_DETECTED,
          occurredAt: event.occurredAt,
          clientFaceCount: null,
          serverFaceCount: verification.serverPersonCount,
          serverVerified: true,
          metadata: {
            serverMethod: verification.method,
            serverPhoneCount: verification.serverPhoneCount,
            sourceEventId: event.id,
            detections: verification.detections ?? [],
          } as Prisma.InputJsonValue,
        },
      })
    );
  }

  await prisma.$transaction(operations);

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
