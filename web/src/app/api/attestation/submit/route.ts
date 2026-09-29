import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import { isAttestationTestKind, TEST_KIND_ATTESTATION } from "@/lib/access/testKinds";
import { computeAttestationScores } from "@/lib/attestation/computeAttestationScores";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import type { AttestationAnswers } from "@/lib/attestation/attestationQuestions";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { sendAttestationCompletionEmail } from "@/lib/email/sendAttestationCompletionEmail";
import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { attestationSubmitBodySchema } from "@/lib/validation/attestationSubmitSchema";

export const dynamic = "force-dynamic";

/**
 * Принимает ответы аттестации, сохраняет submission и шлёт письмо HR.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("attestation_submit", "json_parse_failed", { sessionRef: "unknown" });
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = attestationSubmitBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("attestation_submit", "validation_failed", {
      sessionRef: sessionHint,
      issues: JSON.stringify(zodIssuesForLog(parsed.error)),
    });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const payload = parsed.data;
  const sessionRef = shortSessionRef(payload.sessionId);

  const assessee = buildAuditAssesseeKey({
    firstName: payload.firstName,
    lastName: payload.lastName,
  });
  if (assessee === null) {
    screeningServerLog("attestation_submit", "name_empty_after_normalize", { sessionRef });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok" && invite.status !== "used") {
    screeningServerLog("attestation_submit", "invalid_access_code", {
      sessionRef,
      inviteStatus: invite.status,
    });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }
  if (invite.status === "ok" && !isAttestationTestKind(invite.testKind)) {
    screeningServerLog("attestation_submit", "wrong_test_kind", { sessionRef });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const inviteMeta = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(payload.accessCode) },
    select: { candidateFolderKey: true },
  });
  const candidateFolderKey = inviteMeta?.candidateFolderKey ?? null;

  const answers = payload.answers as AttestationAnswers;
  const scores = computeAttestationScores(answers);
  const attestationReport: AttestationReportJson = {
    scores,
    rosenzweigCodingSummary: null,
    computedAt: formatMoscowNow(),
  };

  const consentAt = new Date(payload.consentRecordedAt);
  const dbStarted = Date.now();
  try {
    await prisma.attestationSubmission.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        assesseeKey: assessee.key,
        assesseeKeyVer: assessee.version,
        firstName: assessee.firstNameDisplay,
        lastName: assessee.lastNameDisplay,
        personalDataConsent: payload.personalDataConsent,
        consentRecordedAt: consentAt,
        answers: payload.answers as Prisma.InputJsonValue,
        attestationReport: attestationReport as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
      },
      update: {
        assesseeKey: assessee.key,
        assesseeKeyVer: assessee.version,
        firstName: assessee.firstNameDisplay,
        lastName: assessee.lastNameDisplay,
        personalDataConsent: payload.personalDataConsent,
        consentRecordedAt: consentAt,
        answers: payload.answers as Prisma.InputJsonValue,
        attestationReport: attestationReport as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
      },
    });
    screeningServerLog("attestation_submit", "db_upsert_ok", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
    });
  } catch (err) {
    screeningServerLog("attestation_submit", "db_upsert_failed", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  if (invite.status === "ok") {
    try {
      const marked = await markAccessCodeUsed(payload.accessCode, TEST_KIND_ATTESTATION);
      screeningServerLog("attestation_submit", "access_code_marked_used", {
        sessionRef,
        marked,
      });
    } catch (err) {
      screeningServerLog("attestation_submit", "access_code_mark_used_failed", {
        sessionRef,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  const fullName = `${assessee.lastNameDisplay} ${assessee.firstNameDisplay}`.trim();

  const emailStarted = Date.now();
  try {
    const emailSent = await sendAttestationCompletionEmail({
      sessionId: payload.sessionId,
      sessionRef,
      fullName,
      scores,
    });
    screeningServerLog("attestation_submit", "email_finished", {
      sessionRef,
      sent: emailSent,
      durationMs: Date.now() - emailStarted,
    });
  } catch (err) {
    const smtpFields = smtpErrorLogFields(err);
    screeningServerLog("attestation_submit", "email_exception", {
      sessionRef,
      durationMs: Date.now() - emailStarted,
      errorName: smtpFields.errorName,
      errorMessage: smtpFields.errorMessage,
      responseCode: smtpFields.responseCode ?? undefined,
    });
  }

  try {
    await finalizeProctorSessionIfNeeded(payload.sessionId, TEST_KIND_ATTESTATION);
  } catch (err) {
    screeningServerLog("attestation_submit", "proctor_finalize_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  screeningServerLog("attestation_submit", "success", {
    sessionRef,
    totalDurationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
