import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import {
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_GAZE_AWAY,
  PROCTOR_EVENT_MULTIPLE_FACES,
  proctorEventCategory,
  type ProctorEventKind,
} from "@/lib/proctor/proctorEventKinds";
import { proctorEventsBodySchema } from "@/lib/proctor/proctorValidation";
import { requireProctorAccess } from "@/lib/proctor/requireProctorAccess";
import { upsertProctorSessionRow } from "@/lib/proctor/upsertProctorSessionRow";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EventResponse = {
  clientEventId: string;
  serverEventId: string;
  needsSnapshot: boolean;
};

/**
 * Принимает пакет событий прокторинга от браузера кандидата.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true; events: EventResponse[] } | { error: string }>> {
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = proctorEventsBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const { sessionId, accessCode, events } = parsed.data;
  const access = await requireProctorAccess(sessionId, accessCode);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const session = await upsertProctorSessionRow({
    sessionId,
    accessCode,
    candidateFolderKey: access.candidateFolderKey,
    testKind: access.testKind,
    avProctorDisabled: access.avProctorDisabled,
  });

  const responses: EventResponse[] = [];

  for (const event of events) {
    const occurredAt = new Date(event.occurredAt);
    const kind = event.kind as ProctorEventKind;
    if (access.avProctorDisabled && !_eventAllowedWhenAvProctorDisabled(kind)) {
      continue;
    }
    const created = await prisma.proctorEvent.create({
      data: {
        proctorSessionId: session.id,
        kind,
        occurredAt,
        clientFaceCount: event.clientFaceCount ?? null,
        metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : undefined,
      },
      select: { id: true },
    });

    responses.push({
      clientEventId: event.clientEventId,
      serverEventId: created.id,
      needsSnapshot: !access.avProctorDisabled && _needsSnapshot(kind),
    });
  }

  return NextResponse.json({ ok: true, events: responses });
}

function _eventAllowedWhenAvProctorDisabled(kind: ProctorEventKind): boolean {
  const category = proctorEventCategory(kind);
  return category === "security" || category === "identity";
}

function _needsSnapshot(kind: ProctorEventKind): boolean {
  return (
    kind === PROCTOR_EVENT_FACE_MISSING ||
    kind === PROCTOR_EVENT_MULTIPLE_FACES ||
    kind === PROCTOR_EVENT_GAZE_AWAY
  );
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
