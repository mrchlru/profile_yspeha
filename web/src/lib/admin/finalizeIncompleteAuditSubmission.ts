import { Prisma } from "@/generated/prisma/client";

import { normalizeAccessCode } from "@/lib/access/accessCode";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import {
  isAuditAccessTestKind,
  isTestKind,
  shouldMarkAccessInviteUsedAfterAuditSubmit,
  type TestKind,
} from "@/lib/access/testKinds";
import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { runAuditSubmitReportPipeline } from "@/lib/audit/runAuditSubmitReportPipeline";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";
import type { AuditSubmitBody } from "@/lib/validation/auditSubmitSchema";

export type FinalizeIncompleteAuditResult = {
  sessionId: string;
  assesseeKey: string;
  fullName: string;
  accessCode: string;
  answerStepCount: number;
  hadReportBefore: boolean;
  inviteMarkedUsed: boolean;
  testKind: TestKind | null;
};

/**
 * Дособирает отчёт и письма по уже сохранённым sync-ответам (без повторного прохождения).
 */
export async function finalizeIncompleteAuditSubmission(input: {
  sessionId?: string;
  assesseeKey?: string;
  accessCode?: string;
}): Promise<FinalizeIncompleteAuditResult> {
  const sessionId = await _resolveSessionId(input);

  const row = await prisma.auditSubmission.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      assesseeKey: true,
      firstName: true,
      lastName: true,
      answers: true,
      auditReport: true,
      personalDataConsent: true,
      consentRecordedAt: true,
      candidateFolderKey: true,
    },
  });
  if (row === null) {
    throw new Error("Прохождение не найдено");
  }

  const answersMap = parseAuditAnswersPayload(
    row.answers as Record<string, Record<string, unknown>>
  );
  const answerStepCount = Object.keys(answersMap).length;
  if (answerStepCount === 0) {
    throw new Error("В прохождении нет сохранённых ответов");
  }

  const accessCode = await _resolveAccessCodeForSubmission({
    explicitCode: input.accessCode,
    firstName: row.firstName,
    lastName: row.lastName,
  });

  const inviteRow = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(accessCode) },
    select: {
      code: true,
      testKind: true,
      startedAt: true,
      usedAt: true,
      revokedAt: true,
      candidateFolderKey: true,
      candidateFirstName: true,
      candidateLastName: true,
      devMode: true,
    },
  });
  if (inviteRow === null) {
    throw new Error(`Приглашение с кодом ${accessCode} не найдено`);
  }
  if (inviteRow.revokedAt !== null) {
    throw new Error("Приглашение отозвано — восстановление невозможно");
  }
  if (!isTestKind(inviteRow.testKind) || !isAuditAccessTestKind(inviteRow.testKind)) {
    throw new Error("Тип приглашения не подходит для аудита ОД/ТУ");
  }

  const assessee = buildAuditAssesseeKey({
    firstName: row.firstName,
    lastName: row.lastName,
  });
  if (assessee === null) {
    throw new Error("Некорректные ФИО в прохождении");
  }

  const consentAt = row.consentRecordedAt ?? new Date();
  const serializedAnswers = _serializeAnswersMap(answersMap);
  const payload: AuditSubmitBody = {
    accessCode,
    sessionId: row.sessionId,
    firstName: assessee.firstNameDisplay,
    lastName: assessee.lastNameDisplay,
    personalDataConsent: true,
    consentRecordedAt: consentAt.toISOString(),
    answers: serializedAnswers,
  };

  if (row.candidateFolderKey === null && inviteRow.candidateFolderKey) {
    await prisma.auditSubmission.update({
      where: { sessionId: row.sessionId },
      data: { candidateFolderKey: inviteRow.candidateFolderKey },
    });
  }

  await prisma.auditSubmission.update({
    where: { sessionId: row.sessionId },
    data: {
      answers: serializedAnswers as Prisma.InputJsonValue,
      personalDataConsent: true,
      consentRecordedAt: consentAt,
      firstName: assessee.firstNameDisplay,
      lastName: assessee.lastNameDisplay,
      assesseeKey: assessee.key,
      assesseeKeyVer: assessee.version,
    },
  });

  let inviteMarkedUsed = false;
  if (shouldMarkAccessInviteUsedAfterAuditSubmit(inviteRow.testKind)) {
    inviteMarkedUsed = await markAccessCodeUsed(accessCode, inviteRow.testKind);
  }

  const sessionRef = shortSessionRef(row.sessionId);
  const hadReportBefore = parseStoredAuditReportJson(row.auditReport) !== null;

  screeningServerLog("admin_audit_finalize", "pipeline_start", {
    sessionRef,
    answerStepCount,
    hadReportBefore,
    code: accessCode,
  });

  await runAuditSubmitReportPipeline({
    payload,
    sessionRef,
    assessee,
    invite: {
      status: "ok",
      code: inviteRow.code,
      testKind: inviteRow.testKind,
      devMode: inviteRow.devMode,
      candidateFirstName: inviteRow.candidateFirstName,
      candidateLastName: inviteRow.candidateLastName,
    },
    consentAt,
    submitTestKind: inviteRow.testKind,
    pipelineStartedAt: Date.now(),
  });

  screeningServerLog("admin_audit_finalize", "pipeline_done", {
    sessionRef,
    inviteMarkedUsed,
  });

  return {
    sessionId: row.sessionId,
    assesseeKey: assessee.key,
    fullName: `${assessee.lastNameDisplay} ${assessee.firstNameDisplay}`,
    accessCode,
    answerStepCount,
    hadReportBefore,
    inviteMarkedUsed,
    testKind: inviteRow.testKind,
  };
}

async function _resolveSessionId(input: {
  sessionId?: string;
  assesseeKey?: string;
}): Promise<string> {
  const rawSession = input.sessionId?.trim() ?? "";
  const rawKey = input.assesseeKey?.trim().toLowerCase() ?? "";

  if (rawSession.length >= 20) {
    return rawSession;
  }

  if (rawSession.length >= 8) {
    const byPrefix = await prisma.auditSubmission.findFirst({
      where: { sessionId: { startsWith: rawSession } },
      orderBy: { createdAt: "desc" },
      select: { sessionId: true },
    });
    if (byPrefix) {
      return byPrefix.sessionId;
    }
  }

  if (rawKey.length >= 3) {
    const byKey = await prisma.auditSubmission.findFirst({
      where: { assesseeKey: { contains: rawKey } },
      orderBy: { createdAt: "desc" },
      select: { sessionId: true },
    });
    if (byKey) {
      return byKey.sessionId;
    }
  }

  throw new Error("Укажите sessionId или assesseeKey прохождения");
}

async function _resolveAccessCodeForSubmission(input: {
  explicitCode?: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  if (input.explicitCode?.trim()) {
    return normalizeAccessCode(input.explicitCode);
  }

  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const rows = await prisma.accessInvite.findMany({
    where: {
      revokedAt: null,
      startedAt: { not: null },
      OR: [
        {
          candidateLastName: { equals: lastName, mode: "insensitive" },
          candidateFirstName: { equals: firstName, mode: "insensitive" },
        },
        {
          candidateLastName: { equals: lastName, mode: "insensitive" },
        },
      ],
    },
    orderBy: [{ usedAt: "asc" }, { startedAt: "desc" }],
    select: { code: true, testKind: true, usedAt: true },
    take: 20,
  });

  const auditRows = rows.filter(
    (row) => isTestKind(row.testKind) && isAuditAccessTestKind(row.testKind)
  );
  const unused = auditRows.find((row) => row.usedAt === null);
  const pick = unused ?? auditRows[0];
  if (!pick) {
    throw new Error(
      "Не удалось найти код приглашения по ФИО — передайте accessCode явно"
    );
  }
  return pick.code;
}

function _serializeAnswersMap(
  answers: ReturnType<typeof parseAuditAnswersPayload>
): AuditSubmitBody["answers"] {
  return answers as unknown as AuditSubmitBody["answers"];
}
