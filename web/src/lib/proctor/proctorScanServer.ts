import { Prisma } from "@/generated/prisma/client";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { TEST_KIND_LABELS, isTestKind } from "@/lib/access/testKinds";
import { analyzeSnapshotWithYolo } from "@/lib/proctor/runYoloSnapshotInference";
import {
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_MULTIPLE_FACES,
  PROCTOR_EVENT_PHONE_DETECTED,
  type ProctorEventKind,
} from "@/lib/proctor/proctorEventKinds";
import { prisma } from "@/lib/prisma";

const SCAN_COOLDOWN_MS: Partial<Record<ProctorEventKind, number>> = {
  [PROCTOR_EVENT_FACE_MISSING]: 12_000,
  [PROCTOR_EVENT_MULTIPLE_FACES]: 12_000,
  [PROCTOR_EVENT_PHONE_DETECTED]: 15_000,
};

export type ProctorScanViolation = {
  kind: ProctorEventKind;
  serverEventId: string;
  serverPersonCount: number;
  serverPhoneCount: number;
};

export type ProctorScanResult = {
  violations: ReadonlyArray<ProctorScanViolation>;
};

/**
 * Анализирует кадр YOLO и создаёт события нарушений с учётом cooldown.
 */
export async function analyzeProctorScanFrame(input: {
  sessionId: string;
  accessCode: string;
  candidateFolderKey: string | null;
  testKind: string;
  jpegBuffer: Buffer;
  width: number | null;
  height: number | null;
  stepLabel?: string | null;
  routePath?: string | null;
}): Promise<ProctorScanResult> {
  const yolo = await analyzeSnapshotWithYolo(input.jpegBuffer);
  const now = new Date();
  const violations: ProctorScanViolation[] = [];

  const session = await prisma.proctorSession.upsert({
    where: { sessionId: input.sessionId },
    create: {
      sessionId: input.sessionId,
      accessCode: normalizeAccessCode(input.accessCode),
      candidateFolderKey: input.candidateFolderKey,
      testKind: input.testKind,
    },
    update: {
      candidateFolderKey: input.candidateFolderKey ?? undefined,
    },
    select: { id: true },
  });

  const kindsToCreate: ProctorEventKind[] = [];
  if (yolo.personCount === 0) {
    kindsToCreate.push(PROCTOR_EVENT_FACE_MISSING);
  } else if (yolo.personCount >= 2) {
    kindsToCreate.push(PROCTOR_EVENT_MULTIPLE_FACES);
  }
  if (yolo.phoneCount > 0) {
    kindsToCreate.push(PROCTOR_EVENT_PHONE_DETECTED);
  }

  for (const kind of kindsToCreate) {
    const cooldownMs = SCAN_COOLDOWN_MS[kind] ?? 12_000;
    const recent = await prisma.proctorEvent.findFirst({
      where: {
        proctorSessionId: session.id,
        kind,
        occurredAt: { gte: new Date(now.getTime() - cooldownMs) },
      },
      select: { id: true },
    });
    if (recent !== null) {
      continue;
    }

    const metadata = {
      serverMethod: "yolov8",
      serverPersonCount: yolo.personCount,
      serverPhoneCount: yolo.phoneCount,
      detections: yolo.detections.map((item) => ({
        label: item.label,
        confidence: Math.round(item.confidence * 1000) / 1000,
      })),
      scanOrigin: "periodic",
      ...(input.stepLabel ? { stepLabel: input.stepLabel } : {}),
      ...(input.routePath ? { routePath: input.routePath } : {}),
    } as Prisma.InputJsonValue;

    const created = await prisma.proctorEvent.create({
      data: {
        proctorSessionId: session.id,
        kind,
        occurredAt: now,
        clientFaceCount: yolo.personCount,
        serverFaceCount: yolo.personCount,
        serverVerified: true,
        metadata,
      },
      select: { id: true },
    });

    await prisma.proctorSnapshot.create({
      data: {
        eventId: created.id,
        mimeType: "image/jpeg",
        width: input.width,
        height: input.height,
        sizeBytes: input.jpegBuffer.length,
        data: new Uint8Array(input.jpegBuffer),
      },
    });

    violations.push({
      kind,
      serverEventId: created.id,
      serverPersonCount: yolo.personCount,
      serverPhoneCount: yolo.phoneCount,
    });
  }

  return { violations };
}

/** Возвращает подпись теста для отчёта прокторинга. */
export function proctorTestLabel(testKind: string): string {
  if (isTestKind(testKind)) {
    return TEST_KIND_LABELS[testKind];
  }
  return testKind;
}
