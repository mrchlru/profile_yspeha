import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import {
  isSpecialistScreeningTestKind,
  TEST_KIND_SPECIALIST_SCREENING,
} from "@/lib/access/testKinds";
import { computeSpecialistScreeningScores } from "@/lib/specialistScreening/computeSpecialistScreeningScores";
import { buildSpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import type { SpecialistScreeningReportJson } from "@/lib/specialistScreening/specialistScreeningReportTypes";
import type { SpecialistScreeningAnswers } from "@/lib/specialistScreening/specialistScreeningQuestions";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { sendSpecialistScreeningUrgentAlertEmail } from "@/lib/email/sendSpecialistScreeningUrgentAlertEmail";
import { runSpecialistScreeningSubmitAiPipeline } from "@/lib/specialistScreening/runSpecialistScreeningSubmitAiPipeline";
import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { specialistScreeningSubmitBodySchema } from "@/lib/validation/specialistScreeningSubmitSchema";

export const dynamic = "force-dynamic";

/**
 * Принимает ответы скрининга PHQ-9/GAD-7/ASRS, сохраняет submission и шлёт письма.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("specialist_screening_submit", "json_parse_failed", {
      sessionRef: "unknown",
    });
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = specialistScreeningSubmitBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("specialist_screening_submit", "validation_failed", {
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
    screeningServerLog("specialist_screening_submit", "name_empty_after_normalize", {
      sessionRef,
    });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok" && invite.status !== "used") {
    screeningServerLog("specialist_screening_submit", "invalid_access_code", {
      sessionRef,
      inviteStatus: invite.status,
    });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }
  if (invite.status === "ok" && !isSpecialistScreeningTestKind(invite.testKind)) {
    screeningServerLog("specialist_screening_submit", "wrong_test_kind", { sessionRef });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const inviteMeta = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(payload.accessCode) },
    select: { candidateFolderKey: true },
  });
  const candidateFolderKey = inviteMeta?.candidateFolderKey ?? null;

  const answers = payload.answers as SpecialistScreeningAnswers;
  const scores = computeSpecialistScreeningScores(answers);
  const interpretation = buildSpecialistScreeningInterpretation(scores);
  const specialistScreeningReport: SpecialistScreeningReportJson = {
    scores,
    interpretation,
    computedAt: formatMoscowNow(),
    conclusionText: null,
    managerActions: null,
    conclusionGeneratedAt: null,
  };

  const consentAt = new Date(payload.consentRecordedAt);
  const dbStarted = Date.now();
  try {
    await prisma.specialistScreeningSubmission.upsert({
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
        specialistScreeningReport:
          specialistScreeningReport as unknown as Prisma.InputJsonValue,
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
        specialistScreeningReport:
          specialistScreeningReport as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
      },
    });
    screeningServerLog("specialist_screening_submit", "db_upsert_ok", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
    });
  } catch (err) {
    screeningServerLog("specialist_screening_submit", "db_upsert_failed", {
      sessionRef,
      durationMs: Date.now() - dbStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  if (invite.status === "ok") {
    try {
      const marked = await markAccessCodeUsed(
        payload.accessCode,
        TEST_KIND_SPECIALIST_SCREENING
      );
      screeningServerLog("specialist_screening_submit", "access_code_marked_used", {
        sessionRef,
        marked,
      });
    } catch (err) {
      screeningServerLog("specialist_screening_submit", "access_code_mark_used_failed", {
        sessionRef,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  const fullName = `${assessee.lastNameDisplay} ${assessee.firstNameDisplay}`.trim();

  if (scores.phq9Item9Positive) {
    try {
      const urgentSent = await sendSpecialistScreeningUrgentAlertEmail({
        sessionId: payload.sessionId,
        sessionRef,
        fullName,
        phq9Item9Score: scores.phq9Item9Score,
      });
      screeningServerLog("specialist_screening_submit", "urgent_email_finished", {
        sessionRef,
        sent: urgentSent,
      });
    } catch (err) {
      const smtpFields = smtpErrorLogFields(err);
      screeningServerLog("specialist_screening_submit", "urgent_email_exception", {
        sessionRef,
        errorName: smtpFields.errorName,
        errorMessage: smtpFields.errorMessage,
      });
    }
  }

  try {
    await finalizeProctorSessionIfNeeded(payload.sessionId, TEST_KIND_SPECIALIST_SCREENING);
  } catch (err) {
    screeningServerLog("specialist_screening_submit", "proctor_finalize_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  if (interpretation !== null) {
    void runSpecialistScreeningSubmitAiPipeline({
      sessionId: payload.sessionId,
      sessionRef,
      fullName,
      interpretation,
      pipelineStartedAt: startedAt,
    });
  } else {
    screeningServerLog("specialist_screening_submit", "pipeline_skipped_no_interpretation", {
      sessionRef,
    });
  }

  screeningServerLog("specialist_screening_submit", "success", {
    sessionRef,
    totalDurationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
