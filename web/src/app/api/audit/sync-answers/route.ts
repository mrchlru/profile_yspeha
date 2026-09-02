import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { isAuditAccessTestKind } from "@/lib/access/testKinds";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { auditSyncAnswersBodySchema } from "@/lib/validation/auditSyncAnswersSchema";

export const dynamic = "force-dynamic";

/**
 * Сохраняет ответы одного шага аудита на сервер (инкрементальная синхронизация).
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

  const parsed = auditSyncAnswersBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    screeningServerLog("audit_sync", "validation_failed", {
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
  if (invite.status === "ok" && !isAuditAccessTestKind(invite.testKind)) {
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const assessee = buildAuditAssesseeKey({
    firstName: payload.firstName,
    lastName: payload.lastName,
  });
  if (assessee === null) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const existing = await prisma.auditSubmission.findUnique({
    where: { sessionId: payload.sessionId },
    select: { answers: true },
  });

  const priorAnswers =
    existing !== null &&
    existing.answers !== null &&
    typeof existing.answers === "object"
      ? (existing.answers as Record<string, Record<string, unknown>>)
      : {};

  const mergedAnswers = {
    ...priorAnswers,
    [String(payload.stepIndex)]: payload.stepAnswers,
  };

  const consentAt = payload.consentRecordedAt ? new Date(payload.consentRecordedAt) : undefined;

  try {
    await prisma.auditSubmission.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        assesseeKey: assessee.key,
        assesseeKeyVer: assessee.version,
        firstName: assessee.firstNameDisplay,
        lastName: assessee.lastNameDisplay,
        personalDataConsent: payload.personalDataConsent ?? false,
        consentRecordedAt: consentAt ?? new Date(),
        answers: mergedAnswers as Prisma.InputJsonValue,
      },
      update: {
        assesseeKey: assessee.key,
        assesseeKeyVer: assessee.version,
        firstName: assessee.firstNameDisplay,
        lastName: assessee.lastNameDisplay,
        ...(payload.personalDataConsent !== undefined
          ? { personalDataConsent: payload.personalDataConsent }
          : {}),
        ...(consentAt !== undefined ? { consentRecordedAt: consentAt } : {}),
        answers: mergedAnswers as Prisma.InputJsonValue,
      },
    });
    screeningServerLog("audit_sync", "step_saved", {
      sessionRef,
      stepIndex: payload.stepIndex,
    });
  } catch (err) {
    screeningServerLog("audit_sync", "step_save_failed", {
      sessionRef,
      stepIndex: payload.stepIndex,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
