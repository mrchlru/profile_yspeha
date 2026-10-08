import { proctorStepLabelFromMetadata } from "@/lib/proctor/proctorStepContext";
import { collectFolderSubmissionSessionIds } from "@/lib/proctor/proctorFolderAccess";
import type { TestKind } from "@/lib/access/testKinds";
import { isProctorTestKind } from "@/lib/access/testKinds";
import {
  PROCTOR_EVENT_AUDIO_NOISE,
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_GAZE_AWAY,
  PROCTOR_EVENT_KIND_LABELS,
  PROCTOR_EVENT_MULTIPLE_FACES,
  PROCTOR_EVENT_PHONE_DETECTED,
  proctorEventCategory,
  type ProctorEventKind,
  type ProctorEventKindCategory,
} from "@/lib/proctor/proctorEventKinds";
import { formatIdentityCheckEventLabel } from "@/lib/identity/formatIdentityCheckEventLabel";
import { proctorTestLabel } from "@/lib/proctor/proctorScanServer";
import { formatMoscowDateTimeTable } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type ProctorViolationsReportJson = {
  version: 1;
  sessionId: string;
  generatedAt: string;
  /** Камера и микрофон прокторинга были отключены на приглашении. */
  avProctorDisabled?: boolean;
  summary: {
    audioViolations: number;
    videoViolations: number;
    securityViolations: number;
    totalViolations: number;
  };
  events: ReadonlyArray<{
    id: string;
    kind: ProctorEventKind;
    kindLabel: string;
    category: ProctorEventKindCategory;
    occurredAtMsk: string;
    clientFaceCount: number | null;
    serverFaceCount: number | null;
    serverPersonCount: number | null;
    serverPhoneCount: number | null;
    serverVerified: boolean | null;
    serverMethod: string | null;
    snapshotId: string | null;
    audioClipId: string | null;
    stepLabel: string | null;
  }>;
};

export type ProctorViolationEventRow = ProctorViolationsReportJson["events"][number];

export type ProctorViolationsSessionBlock = {
  sessionId: string;
  testKind: string;
  testLabel: string;
  startedAtMsk: string;
  avProctorDisabled: boolean;
  summary: ProctorViolationsReportJson["summary"];
  events: ReadonlyArray<ProctorViolationEventRow>;
  /** Полная аудиозапись прохождения (если загружена). */
  sessionRecordingId: string | null;
  /** Длительность полной записи в миллисекундах (из БД). */
  sessionRecordingDurationMs: number | null;
};

export type ProctorViolationsReportView = {
  kind: "violations_report";
  title: string;
  fullName: string;
  createdAt: string;
  /** Хотя бы одна сессия проходила без камеры и микрофона. */
  avProctorDisabled: boolean;
  summary: ProctorViolationsReportJson["summary"];
  /** Все нарушения по всем сессиям (плоский список). */
  events: ReadonlyArray<ProctorViolationEventRow>;
  /** Группировка по прохождениям / типам теста. */
  sessions: ReadonlyArray<ProctorViolationsSessionBlock>;
  /** Тесты, где зафиксировано хотя бы одно нарушение. */
  testsWithViolations: ReadonlyArray<{ testLabel: string; totalViolations: number }>;
};

/**
 * Собирает JSON отчёта по нарушениям прокторинга для сессии.
 */
export async function buildProctorViolationsReportJson(
  sessionId: string
): Promise<ProctorViolationsReportJson | null> {
  const session = await prisma.proctorSession.findUnique({
    where: { sessionId },
    include: {
      events: {
        orderBy: { occurredAt: "asc" },
        include: { snapshot: { select: { id: true } }, audioClip: { select: { id: true } } },
      },
    },
  });
  if (session === null) {
    return null;
  }

  const avProctorDisabled = session.avProctorDisabled === true;

  const events = session.events.map((event) => {
    const kind = event.kind as ProctorEventKind;
    const metadata =
      event.metadata !== null && typeof event.metadata === "object"
        ? (event.metadata as Record<string, unknown>)
        : null;
    return {
      id: event.id,
      kind,
      kindLabel:
        proctorEventCategory(kind) === "identity"
          ? formatIdentityCheckEventLabel(kind, metadata)
          : (PROCTOR_EVENT_KIND_LABELS[kind] ?? event.kind),
      category: proctorEventCategory(kind),
      occurredAtMsk: formatMoscowDateTimeTable(event.occurredAt),
      clientFaceCount: event.clientFaceCount,
      serverFaceCount: event.serverFaceCount,
      serverPersonCount:
        typeof metadata?.serverPersonCount === "number"
          ? metadata.serverPersonCount
          : event.serverFaceCount,
      serverPhoneCount:
        typeof metadata?.serverPhoneCount === "number" ? metadata.serverPhoneCount : null,
      serverVerified: event.serverVerified,
      serverMethod: typeof metadata?.serverMethod === "string" ? metadata.serverMethod : null,
      snapshotId: event.snapshot?.id ?? null,
      audioClipId: event.audioClip?.id ?? null,
      stepLabel: proctorStepLabelFromMetadata(metadata),
      sourceEventId:
        typeof metadata?.sourceEventId === "string" ? metadata.sourceEventId : null,
    };
  }).filter(_isReportableProctorEvent);

  const snapshotByEventId = new Map(
    events.filter((item) => item.snapshotId).map((item) => [item.id, item.snapshotId as string])
  );

  const eventsWithSnapshots = events.map((event) => ({
    ...event,
    snapshotId:
      event.snapshotId ??
      (event.sourceEventId ? (snapshotByEventId.get(event.sourceEventId) ?? null) : null),
    sourceEventId: undefined,
  }));

  const reportEvents = avProctorDisabled
    ? _stripAvProctorReportEvents(eventsWithSnapshots)
    : eventsWithSnapshots;
  const summary = _summarizeProctorReportEvents(reportEvents);

  return {
    version: 1,
    sessionId,
    generatedAt: new Date().toISOString(),
    ...(avProctorDisabled ? { avProctorDisabled: true } : {}),
    summary,
    events: reportEvents.map((event) => ({
      id: event.id,
      kind: event.kind,
      kindLabel: event.kindLabel,
      category: event.category,
      occurredAtMsk: event.occurredAtMsk,
      clientFaceCount: event.clientFaceCount,
      serverFaceCount: event.serverFaceCount,
      serverPersonCount: event.serverPersonCount,
      serverPhoneCount: event.serverPhoneCount,
      serverVerified: event.serverVerified,
      serverMethod: event.serverMethod,
      snapshotId: event.snapshotId,
      audioClipId: event.audioClipId,
      stepLabel: event.stepLabel,
    })),
  };
}

function _mapSessionEvents(
  events: ReadonlyArray<{
    id: string;
    kind: string;
    occurredAt: Date;
    clientFaceCount: number | null;
    serverFaceCount: number | null;
    serverVerified: boolean | null;
    metadata: unknown;
    snapshot: { id: string } | null;
    audioClip: { id: string } | null;
  }>
): ProctorViolationEventRow[] {
  const mapped = events.map((event) => {
    const kind = event.kind as ProctorEventKind;
    const metadata =
      event.metadata !== null && typeof event.metadata === "object"
        ? (event.metadata as Record<string, unknown>)
        : null;
    return {
      id: event.id,
      kind,
      kindLabel:
        proctorEventCategory(kind) === "identity"
          ? formatIdentityCheckEventLabel(kind, metadata)
          : (PROCTOR_EVENT_KIND_LABELS[kind] ?? event.kind),
      category: proctorEventCategory(kind),
      occurredAtMsk: formatMoscowDateTimeTable(event.occurredAt),
      clientFaceCount: event.clientFaceCount,
      serverFaceCount: event.serverFaceCount,
      serverPersonCount:
        typeof metadata?.serverPersonCount === "number"
          ? metadata.serverPersonCount
          : event.serverFaceCount,
      serverPhoneCount:
        typeof metadata?.serverPhoneCount === "number" ? metadata.serverPhoneCount : null,
      serverVerified: event.serverVerified,
      serverMethod: typeof metadata?.serverMethod === "string" ? metadata.serverMethod : null,
      snapshotId: event.snapshot?.id ?? null,
      audioClipId: event.audioClip?.id ?? null,
      stepLabel: proctorStepLabelFromMetadata(metadata),
      sourceEventId:
        typeof metadata?.sourceEventId === "string" ? metadata.sourceEventId : null,
    };
  }).filter(_isReportableProctorEvent);

  const snapshotByEventId = new Map(
    mapped.filter((item) => item.snapshotId).map((item) => [item.id, item.snapshotId as string])
  );

  return mapped.map((event) => ({
    id: event.id,
    kind: event.kind,
    kindLabel: event.kindLabel,
    category: event.category,
    occurredAtMsk: event.occurredAtMsk,
    clientFaceCount: event.clientFaceCount,
    serverFaceCount: event.serverFaceCount,
    serverPersonCount: event.serverPersonCount,
    serverPhoneCount: event.serverPhoneCount,
    serverVerified: event.serverVerified,
    serverMethod: event.serverMethod,
    snapshotId:
      event.snapshotId ??
      (event.sourceEventId ? (snapshotByEventId.get(event.sourceEventId) ?? null) : null),
    audioClipId: event.audioClipId,
    stepLabel: event.stepLabel,
  }));
}

/**
 * Условие Prisma: все proctor-сессии, относящиеся к папке сотрудника.
 */
async function _proctorSessionsWhereForFolder(
  folderKey: string
): Promise<Prisma.ProctorSessionWhereInput> {
  const submissionSessionIds = await collectFolderSubmissionSessionIds(folderKey);
  const orFilters: Prisma.ProctorSessionWhereInput[] = [{ candidateFolderKey: folderKey }];
  if (submissionSessionIds.length > 0) {
    orFilters.push({ sessionId: { in: submissionSessionIds } });
  }
  return { OR: orFilters };
}

const _proctorSessionInclude = {
  sessionAudio: { select: { id: true, durationMs: true } },
  events: {
    orderBy: { occurredAt: "asc" as const },
    include: { snapshot: { select: { id: true } }, audioClip: { select: { id: true } } },
  },
} satisfies Prisma.ProctorSessionInclude;

/**
 * Сводный отчёт по всем сессиям прокторинга в папке сотрудника.
 */
export async function buildProctorFolderViolationsReportView(
  folderKey: string
): Promise<ProctorViolationsReportView | null> {
  const sessions = await prisma.proctorSession.findMany({
    where: await _proctorSessionsWhereForFolder(folderKey),
    orderBy: { createdAt: "asc" },
    include: _proctorSessionInclude,
  });

  if (sessions.length === 0) {
    return null;
  }

  const sessionBlocks: ProctorViolationsSessionBlock[] = sessions.map((session) => {
    const avDisabled = session.avProctorDisabled === true;
    const rawEvents = _mapSessionEvents(session.events);
    const events = avDisabled ? _stripAvProctorReportEvents(rawEvents) : rawEvents;
    return {
      sessionId: session.sessionId,
      testKind: session.testKind,
      testLabel: proctorTestLabel(session.testKind),
      startedAtMsk: formatMoscowDateTimeTable(session.createdAt),
      avProctorDisabled: avDisabled,
      summary: _summarizeProctorReportEvents(events),
      events,
      sessionRecordingId: avDisabled ? null : (session.sessionAudio?.id ?? null),
      sessionRecordingDurationMs: avDisabled
        ? null
        : (session.sessionAudio?.durationMs ?? null),
    };
  });

  const allEvents = sessionBlocks.flatMap((block) => block.events);
  const summary = {
    audioViolations: allEvents.filter((item) => item.category === "audio").length,
    videoViolations: allEvents.filter((item) => item.category === "video").length,
    securityViolations: allEvents.filter((item) => item.category === "security").length,
    totalViolations: allEvents.length,
  };

  const testsWithViolations = sessionBlocks
    .filter((block) => block.summary.totalViolations > 0)
    .map((block) => ({
      testLabel: block.testLabel,
      totalViolations: block.summary.totalViolations,
    }));

  const fullName = await _resolveProctorCandidateName(folderKey, sessions[0]?.sessionId ?? null);

  return {
    kind: "violations_report",
    title: "Отчёт по нарушениям",
    fullName,
    createdAt: (sessions.at(-1)?.endedAt ?? sessions.at(-1)?.createdAt ?? new Date()).toISOString(),
    avProctorDisabled: sessionBlocks.some((block) => block.avProctorDisabled),
    summary,
    events: allEvents,
    sessions: sessionBlocks,
    testsWithViolations,
  };
}

async function _resolveProctorCandidateName(
  folderKey: string,
  sessionId: string | null
): Promise<string> {
  if (sessionId) {
    const auditRow = await prisma.auditSubmission.findUnique({
      where: { sessionId },
      select: { firstName: true, lastName: true },
    });
    if (auditRow) {
      return `${auditRow.lastName} ${auditRow.firstName}`.trim();
    }
    const burnoutRow = await prisma.burnoutSubmission.findUnique({
      where: { sessionId },
      select: { firstName: true, lastName: true },
    });
    if (burnoutRow) {
      return `${burnoutRow.lastName} ${burnoutRow.firstName}`.trim();
    }
    const specialistRow = await prisma.specialistScreeningSubmission.findUnique({
      where: { sessionId },
      select: { firstName: true, lastName: true },
    });
    if (specialistRow) {
      return `${specialistRow.lastName} ${specialistRow.firstName}`.trim();
    }
    const attestationRow = await prisma.attestationSubmission.findUnique({
      where: { sessionId },
      select: { firstName: true, lastName: true },
    });
    if (attestationRow) {
      return `${attestationRow.lastName} ${attestationRow.firstName}`.trim();
    }
    const profRow = await prisma.profSbEducationSubmission.findUnique({
      where: { sessionId },
      select: { firstName: true, lastName: true },
    });
    if (profRow) {
      return `${profRow.lastName} ${profRow.firstName}`.trim();
    }
    const screeningRow = await prisma.screeningSubmission.findUnique({
      where: { sessionId },
      select: { profileName: true },
    });
    if (screeningRow?.profileName) {
      return screeningRow.profileName.trim();
    }
  }

  const folder = await prisma.candidateFolderRecord.findUnique({
    where: { folderKey },
    select: { lastName: true, firstName: true },
  });
  if (folder) {
    return `${folder.lastName} ${folder.firstName}`.trim();
  }

  return "Кандидат";
}

/**
 * Финализирует сессию прокторинга и сохраняет отчёт в БД.
 */
export async function finalizeProctorSession(sessionId: string): Promise<ProctorViolationsReportJson | null> {
  const report = await buildProctorViolationsReportJson(sessionId);
  if (report === null) {
    return null;
  }

  await prisma.proctorSession.update({
    where: { sessionId },
    data: {
      endedAt: new Date(),
      reportJson: report as Prisma.InputJsonValue,
    },
  });

  return report;
}

/**
 * Финализирует сессию прокторинга, если тип теста это предусматривает.
 */
export async function finalizeProctorSessionIfNeeded(
  sessionId: string,
  testKind: TestKind | null | undefined
): Promise<ProctorViolationsReportJson | null> {
  if (!isProctorTestKind(testKind)) {
    return null;
  }
  return finalizeProctorSession(sessionId);
}

/**
 * Строит представление отчёта для админ-панели.
 */
export async function buildProctorViolationsReportView(
  sessionId: string
): Promise<ProctorViolationsReportView | null> {
  const session = await prisma.proctorSession.findUnique({
    where: { sessionId },
    select: {
      candidateFolderKey: true,
      reportJson: true,
      createdAt: true,
      endedAt: true,
      testKind: true,
      avProctorDisabled: true,
      sessionAudio: { select: { id: true, durationMs: true } },
    },
  });
  if (session === null) {
    return null;
  }

  if (session.candidateFolderKey) {
    return buildProctorFolderViolationsReportView(session.candidateFolderKey);
  }

  let report =
    session.reportJson !== null && typeof session.reportJson === "object"
      ? (session.reportJson as unknown as ProctorViolationsReportJson)
      : null;
  if (report === null || report.version !== 1) {
    report = await buildProctorViolationsReportJson(sessionId);
  }
  if (report === null) {
    return null;
  }

  const avProctorDisabled =
    session.avProctorDisabled === true || report.avProctorDisabled === true;
  const normalizedSummary = _normalizeViolationsSummary(
    avProctorDisabled ? _summarizeProctorReportEvents(report.events) : report.summary
  );
  const fullName = await _resolveProctorCandidateName("", sessionId);
  const rawEvents = report.events.map((event) => ({
    ...event,
    audioClipId: event.audioClipId ?? null,
  }));
  const events = avProctorDisabled ? _stripAvProctorReportEvents(rawEvents) : rawEvents;
  const summary = avProctorDisabled ? _summarizeProctorReportEvents(events) : normalizedSummary;

  return {
    kind: "violations_report",
    title: "Отчёт по нарушениям",
    fullName,
    createdAt: (session.endedAt ?? session.createdAt).toISOString(),
    avProctorDisabled,
    summary,
    events,
    sessions: [
      {
        sessionId,
        testKind: session.testKind,
        testLabel: proctorTestLabel(session.testKind),
        startedAtMsk: formatMoscowDateTimeTable(session.createdAt),
        avProctorDisabled,
        summary,
        events,
        sessionRecordingId: avProctorDisabled ? null : (session.sessionAudio?.id ?? null),
        sessionRecordingDurationMs: avProctorDisabled
          ? null
          : (session.sessionAudio?.durationMs ?? null),
      },
    ],
    testsWithViolations:
      summary.totalViolations > 0
        ? [
            {
              testLabel: proctorTestLabel(session.testKind),
              totalViolations: summary.totalViolations,
            },
          ]
        : [],
  };
}

/**
 * Дополняет сводку полем securityViolations для старых сохранённых отчётов.
 */
function _normalizeViolationsSummary(
  summary: ProctorViolationsReportJson["summary"] | {
    audioViolations: number;
    videoViolations: number;
    totalViolations: number;
    securityViolations?: number;
  }
): ProctorViolationsReportJson["summary"] {
  return {
    audioViolations: summary.audioViolations,
    videoViolations: summary.videoViolations,
    securityViolations: summary.securityViolations ?? 0,
    totalViolations: summary.totalViolations,
  };
}

/** Проверяет наличие финализированного отчёта прокторинга для папки кандидата. */
export async function folderHasProctorReport(folderKey: string): Promise<boolean> {
  const count = await prisma.proctorSession.count({
    where: await _proctorSessionsWhereForFolder(folderKey),
  });
  return count > 0;
}

/** Возвращает, есть ли прокторинг для конкретной audit-сессии. */
export async function auditSessionHasProctorReport(sessionId: string): Promise<boolean> {
  const row = await prisma.proctorSession.findUnique({
    where: { sessionId },
    select: { id: true },
  });
  return row !== null;
}

export const VIDEO_VIOLATION_KINDS: ReadonlyArray<ProctorEventKind> = [
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_GAZE_AWAY,
  PROCTOR_EVENT_MULTIPLE_FACES,
  PROCTOR_EVENT_PHONE_DETECTED,
];

export const AUDIO_VIOLATION_KINDS: ReadonlyArray<ProctorEventKind> = [PROCTOR_EVENT_AUDIO_NOISE];

/**
 * Скрывает видеонарушения, которые сервер явно не подтвердил (ложные «2 лица» и т.п.).
 */
function _stripAvProctorReportEvents(
  events: ReadonlyArray<ProctorViolationEventRow>
): ProctorViolationEventRow[] {
  return events
    .filter((event) => {
      const category = proctorEventCategory(event.kind);
      return category === "security" || category === "identity";
    })
    .map((event) => ({
      ...event,
      snapshotId: null,
      audioClipId: null,
      clientFaceCount: null,
      serverFaceCount: null,
      serverPersonCount: null,
      serverPhoneCount: null,
      serverVerified: null,
      serverMethod: null,
    }));
}

function _summarizeProctorReportEvents(
  events: ReadonlyArray<ProctorViolationEventRow>
): ProctorViolationsReportJson["summary"] {
  const audioViolations = events.filter((item) => item.category === "audio").length;
  const videoViolations = events.filter((item) => item.category === "video").length;
  const securityViolations = events.filter((item) => item.category === "security").length;
  return {
    audioViolations,
    videoViolations,
    securityViolations,
    totalViolations: events.length,
  };
}

function _isReportableProctorEvent(event: {
  kind: ProctorEventKind;
  serverVerified: boolean | null;
}): boolean {
  if (event.serverVerified !== false) {
    return true;
  }
  return (
    event.kind !== PROCTOR_EVENT_MULTIPLE_FACES &&
    event.kind !== PROCTOR_EVENT_FACE_MISSING &&
    event.kind !== PROCTOR_EVENT_GAZE_AWAY
  );
}
