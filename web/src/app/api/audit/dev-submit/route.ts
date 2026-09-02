import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { TEST_KIND_STATE_AUDIT_DEV } from "@/lib/access/testKinds";
import { buildDevAuditTextReport } from "@/lib/audit/report/buildDevAuditTextReport";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { sendAuditDevTextEmail } from "@/lib/email/sendAuditDevTextEmail";
import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { auditDevSubmitBodySchema } from "@/lib/validation/auditDevSubmitSchema";

export const dynamic = "force-dynamic";

export type AuditDevSubmitResponse = {
  ok: true;
  textReport: string;
  emailSent: boolean;
};

/**
 * DEV-отправка аудита: скоринг пройденных шагов, plain-text на экран и в письмо.
 * Только код `state_audit_dev`; без PDF, без ИИ, код не помечается использованным.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<AuditDevSubmitResponse | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("audit_dev_submit", "json_parse_failed", { sessionRef: "unknown" });
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = auditDevSubmitBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("audit_dev_submit", "validation_failed", {
      sessionRef: sessionHint,
      issues: JSON.stringify(zodIssuesForLog(parsed.error)),
    });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const payload = parsed.data;
  const sessionRef = shortSessionRef(payload.sessionId);

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok") {
    screeningServerLog("audit_dev_submit", "invalid_access_code", {
      sessionRef,
      inviteStatus: invite.status,
    });
    return NextResponse.json({ error: "Недействительный dev-код доступа" }, { status: 403 });
  }
  if (invite.testKind !== TEST_KIND_STATE_AUDIT_DEV && !invite.devMode) {
    screeningServerLog("audit_dev_submit", "wrong_test_kind", {
      sessionRef,
      testKind: invite.testKind,
      devMode: invite.devMode,
    });
    return NextResponse.json({ error: "Эндпоинт только для DEV-приглашений" }, { status: 403 });
  }

  const firstName = (payload.firstName?.trim() || "Dev").slice(0, 200);
  const lastName = (payload.lastName?.trim() || "Тестер").slice(0, 200);

  const assessee = buildAuditAssesseeKey({ firstName, lastName });
  if (assessee === null) {
    screeningServerLog("audit_dev_submit", "name_empty_after_normalize", { sessionRef });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const answersMap = parseAuditAnswersPayload(
    payload.answers as Record<string, Record<string, unknown>>
  );

  const generatedAt = formatMoscowNow();
  const fullName = `${assessee.lastNameDisplay} ${assessee.firstNameDisplay}`;
  const textReport = buildDevAuditTextReport(answersMap, {
    fullName,
    sessionId: payload.sessionId,
    generatedAt,
  });

  const consentAt = new Date(payload.consentRecordedAt);
  try {
    await prisma.auditSubmission.upsert({
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
        auditReport: {
          dev: true,
          textReport,
          generatedAt,
          emailSent: false,
        } as Prisma.InputJsonValue,
      },
      update: {
        assesseeKey: assessee.key,
        assesseeKeyVer: assessee.version,
        firstName: assessee.firstNameDisplay,
        lastName: assessee.lastNameDisplay,
        personalDataConsent: payload.personalDataConsent,
        consentRecordedAt: consentAt,
        answers: payload.answers as Prisma.InputJsonValue,
        auditReport: {
          dev: true,
          textReport,
          generatedAt,
          emailSent: false,
        } as Prisma.InputJsonValue,
      },
    });
    screeningServerLog("audit_dev_submit", "db_upsert_ok", { sessionRef });
  } catch (err) {
    screeningServerLog("audit_dev_submit", "db_upsert_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  let emailSent = false;
  try {
    emailSent = await sendAuditDevTextEmail({
      sessionId: payload.sessionId,
      sessionRef,
      fullName,
      textReport,
    });
    screeningServerLog("audit_dev_submit", "email_finished", { sessionRef, sent: emailSent });
  } catch (err) {
    const smtpFields = smtpErrorLogFields(err);
    screeningServerLog("audit_dev_submit", "email_exception", {
      sessionRef,
      errorName: smtpFields.errorName,
      errorMessage: smtpFields.errorMessage,
    });
    emailSent = false;
  }

  if (emailSent) {
    try {
      await prisma.auditSubmission.update({
        where: { sessionId: payload.sessionId },
        data: {
          auditReport: {
            dev: true,
            textReport,
            generatedAt,
            emailSent: true,
          } as Prisma.InputJsonValue,
        },
      });
    } catch {
      /* не блокируем ответ клиенту */
    }
  }

  screeningServerLog("audit_dev_submit", "success", {
    sessionRef,
    totalDurationMs: Date.now() - startedAt,
    emailSent,
  });

  return NextResponse.json({ ok: true, textReport, emailSent }, { status: 200 });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
