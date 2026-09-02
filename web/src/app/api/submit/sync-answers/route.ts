import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { normalizeAccessCode } from "@/lib/access/accessCode";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { isAuditAccessTestKind, TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { emptyScreeningStepDefaults } from "@/lib/screening/emptyScreeningStepDefaults";
import { screeningSyncAnswersBodySchema } from "@/lib/validation/screeningSyncAnswersSchema";

export const dynamic = "force-dynamic";

/**
 * Сохраняет ответы одного шага скрининга (инкрементальная синхронизация).
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

  const parsed = screeningSyncAnswersBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    screeningServerLog("screening_sync", "validation_failed", {
      issues: JSON.stringify(zodIssuesForLog(parsed.error)),
    });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const payload = parsed.data;
  const sessionRef = shortSessionRef(payload.sessionId);

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok" && invite.status !== "used") {
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }
  if (
    invite.status === "ok" &&
    invite.testKind !== TEST_KIND_SCREENING &&
    !isAuditAccessTestKind(invite.testKind)
  ) {
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const inviteMeta = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(payload.accessCode) },
    select: {
      candidateFolderKey: true,
      interviewFolderKey: true,
      candidateLastName: true,
      candidateFirstName: true,
      candidateMiddleName: true,
    },
  });

  const profileName =
    inviteMeta?.candidateLastName && inviteMeta?.candidateFirstName
      ? [inviteMeta.candidateLastName, inviteMeta.candidateFirstName, inviteMeta.candidateMiddleName]
          .filter((part) => part && part.trim().length > 0)
          .join(" ")
      : payload.profileName;

  const existing = await prisma.screeningSubmission.findUnique({
    where: { sessionId: payload.sessionId },
    select: {
      step1Data: true,
      step2Data: true,
      step3Data: true,
      step4Data: true,
    },
  });

  const defaults = emptyScreeningStepDefaults();
  const step1Data =
    payload.step === 1
      ? payload.stepData
      : existing?.step1Data ?? defaults.step1Data;
  const step2Data =
    payload.step === 2
      ? payload.stepData
      : existing?.step2Data ?? defaults.step2Data;
  const step3Data =
    payload.step === 3
      ? payload.stepData
      : existing?.step3Data ?? defaults.step3Data;
  const step4Data =
    payload.step === 4
      ? payload.stepData
      : existing?.step4Data ?? defaults.step4Data;

  const consentAt = payload.consentRecordedAt ? new Date(payload.consentRecordedAt) : undefined;

  try {
    await prisma.screeningSubmission.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        profileName,
        personalDataConsent: payload.personalDataConsent ?? false,
        consentRecordedAt: consentAt ?? new Date(),
        step1Data: step1Data as Prisma.InputJsonValue,
        step2Data: step2Data as Prisma.InputJsonValue,
        step3Data: step3Data as Prisma.InputJsonValue,
        step4Data: step4Data as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey: inviteMeta?.candidateFolderKey ?? null,
        interviewFolderKey: inviteMeta?.interviewFolderKey ?? null,
      },
      update: {
        profileName,
        ...(payload.personalDataConsent !== undefined
          ? { personalDataConsent: payload.personalDataConsent }
          : {}),
        ...(consentAt !== undefined ? { consentRecordedAt: consentAt } : {}),
        step1Data: step1Data as Prisma.InputJsonValue,
        step2Data: step2Data as Prisma.InputJsonValue,
        step3Data: step3Data as Prisma.InputJsonValue,
        step4Data: step4Data as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey: inviteMeta?.candidateFolderKey ?? null,
        interviewFolderKey: inviteMeta?.interviewFolderKey ?? null,
      },
    });
    screeningServerLog("screening_sync", "step_saved", {
      sessionRef,
      step: payload.step,
    });
  } catch (err) {
    screeningServerLog("screening_sync", "step_save_failed", {
      sessionRef,
      step: payload.step,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
