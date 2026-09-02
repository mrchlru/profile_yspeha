import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import { isBurnoutTestKind, TEST_KIND_BURNOUT } from "@/lib/access/testKinds";
import { computeMaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { buildMaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";
import { tryScheduleBurnoutReminderFromSubmission } from "@/lib/burnout/tryScheduleBurnoutReminder";
import { runDueBurnoutRemindersInBackground } from "@/lib/burnout/runDueBurnoutRemindersInBackground";
import type { BurnoutReportJson } from "@/lib/burnout/burnoutReportTypes";
import type { MaslachBurnoutAnswers } from "@/lib/burnout/maslachBurnoutQuestions";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { scheduleBurnoutGoogleSheetsExport } from "@/lib/googleSheets/exportSubmissionToGoogleSheets";
import { burnoutSubmitBodySchema } from "@/lib/validation/burnoutSubmitSchema";

export const dynamic = "force-dynamic";

/**
 * Принимает ответы теста Маслач, сохраняет `BurnoutSubmission`,
 * считает сырые суммы по шкалам и помечает код доступа использованным.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("burnout_submit", "json_parse_failed", { sessionRef: "unknown" });
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = burnoutSubmitBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("burnout_submit", "validation_failed", {
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
    screeningServerLog("burnout_submit", "name_empty_after_normalize", { sessionRef });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok" && invite.status !== "used") {
    screeningServerLog("burnout_submit", "invalid_access_code", {
      sessionRef,
      inviteStatus: invite.status,
    });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }
  if (invite.status === "ok" && !isBurnoutTestKind(invite.testKind)) {
    screeningServerLog("burnout_submit", "wrong_test_kind", { sessionRef });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const inviteMeta = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(payload.accessCode) },
    select: { candidateFolderKey: true },
  });
  const candidateFolderKey = inviteMeta?.candidateFolderKey ?? null;

  const scores = computeMaslachBurnoutScores(payload.answers as MaslachBurnoutAnswers);
  const interpretation = buildMaslachBurnoutInterpretation(scores);
  const burnoutReport: BurnoutReportJson = {
    scores,
    interpretation,
    computedAt: formatMoscowNow(),
  };

  const consentAt = new Date(payload.consentRecordedAt);
  const dbStarted = Date.now();
  try {
    await prisma.burnoutSubmission.upsert({
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
        burnoutReport: burnoutReport as unknown as Prisma.InputJsonValue,
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
        burnoutReport: burnoutReport as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
      },
    });
    screeningServerLog("burnout_submit", "db_upsert_ok", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
    });
  } catch (err) {
    screeningServerLog("burnout_submit", "db_upsert_failed", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  if (invite.status === "ok") {
    try {
      const marked = await markAccessCodeUsed(payload.accessCode, TEST_KIND_BURNOUT);
      screeningServerLog("burnout_submit", "access_code_marked_used", { sessionRef, marked });
    } catch (err) {
      screeningServerLog("burnout_submit", "access_code_mark_used_failed", {
        sessionRef,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  try {
    await tryScheduleBurnoutReminderFromSubmission({
      assesseeKey: assessee.key,
      personName: `${assessee.lastNameDisplay} ${assessee.firstNameDisplay}`,
      candidateFolderKey,
      sessionId: payload.sessionId,
      scores,
    });
  } catch (err) {
    screeningServerLog("burnout_submit", "reminder_schedule_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  runDueBurnoutRemindersInBackground("burnout_submit");

  screeningServerLog("burnout_submit", "success", {
    sessionRef,
    totalDurationMs: Date.now() - startedAt,
  });

  const inviteDevRow = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(payload.accessCode) },
    select: { devMode: true },
  });
  scheduleBurnoutGoogleSheetsExport({
    devMode: inviteDevRow?.devMode === true,
    accessCode: payload.accessCode,
    firstName: assessee.firstNameDisplay,
    lastName: assessee.lastNameDisplay,
    submittedAt: new Date(),
    scores,
  });

  try {
    await finalizeProctorSessionIfNeeded(payload.sessionId, TEST_KIND_BURNOUT);
  } catch (err) {
    screeningServerLog("burnout_submit", "proctor_finalize_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
