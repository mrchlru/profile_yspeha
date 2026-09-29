import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { isAttestationTestKind } from "@/lib/access/testKinds";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { attestationSyncAnswersBodySchema } from "@/lib/validation/attestationSyncAnswersSchema";

export const dynamic = "force-dynamic";

/**
 * Частичная синхронизация ответов аттестации.
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

  const parsed = attestationSyncAnswersBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    screeningServerLog("attestation_sync", "validation_failed", {
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
  if (invite.status === "ok" && !isAttestationTestKind(invite.testKind)) {
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const assessee = buildAuditAssesseeKey({
    firstName: payload.firstName,
    lastName: payload.lastName,
  });
  if (assessee === null) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const existing = await prisma.attestationSubmission.findUnique({
    where: { sessionId: payload.sessionId },
    select: { answers: true },
  });

  const mergedAnswers =
    existing !== null && existing.answers !== null && typeof existing.answers === "object"
      ? {
          ...(existing.answers as Record<string, number | string | null>),
          ...payload.answers,
        }
      : payload.answers;

  const consentAt = payload.consentRecordedAt ? new Date(payload.consentRecordedAt) : undefined;

  try {
    await prisma.attestationSubmission.upsert({
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
    screeningServerLog("attestation_sync", "answers_saved", { sessionRef });
  } catch (err) {
    screeningServerLog("attestation_sync", "save_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
