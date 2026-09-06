import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import { isProfSbEducationTestKind, TEST_KIND_PROF_SB_EDUCATION } from "@/lib/access/testKinds";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { screeningServerLog, zodIssuesForLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { finalizeProctorSessionIfNeeded } from "@/lib/proctor/buildProctorViolationsReport";
import { buildPendingProfSbEducationReport } from "@/lib/profSbEducation/profSbEducationTypes";
import { resolveProfSbEducationFolderKey } from "@/lib/profSbEducation/reconcileProfSbEducationFolderLinks";
import { buildStep4AiSummary } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";
import { prisma } from "@/lib/prisma";
import { profSbEducationSubmitBodySchema } from "@/lib/validation/profSbEducationSubmitSchema";

export const dynamic = "force-dynamic";

/**
 * Принимает ответы анкеты «ПРОФ СБ + ПРОФ образование» и сохраняет сессию.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const startedAt = Date.now();

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("prof_sb_education_submit", "json_parse_failed", { sessionRef: "unknown" });
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = profSbEducationSubmitBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    const sessionHint =
      typeof jsonBody === "object" &&
      jsonBody !== null &&
      "sessionId" in jsonBody &&
      typeof (jsonBody as { sessionId?: unknown }).sessionId === "string"
        ? shortSessionRef((jsonBody as { sessionId: string }).sessionId)
        : "unknown";
    screeningServerLog("prof_sb_education_submit", "validation_failed", {
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
    screeningServerLog("prof_sb_education_submit", "name_empty_after_normalize", { sessionRef });
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const invite = await checkAccessInvite(payload.accessCode);
  if (invite.status !== "ok" && invite.status !== "used") {
    screeningServerLog("prof_sb_education_submit", "invalid_access_code", {
      sessionRef,
      inviteStatus: invite.status,
    });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }
  if (invite.status === "ok" && !isProfSbEducationTestKind(invite.testKind)) {
    screeningServerLog("prof_sb_education_submit", "wrong_test_kind", { sessionRef });
    return NextResponse.json({ error: "Недействительный код доступа" }, { status: 403 });
  }

  const candidateFolderKey = await resolveProfSbEducationFolderKey({
    accessInviteCode: payload.accessCode,
    firstName: assessee.firstNameDisplay,
    lastName: assessee.lastNameDisplay,
  });

  const profReport = buildProfSbEducationReportFromAnswers(payload.answers);

  const consentAt = new Date(payload.consentRecordedAt);
  const dbStarted = Date.now();
  try {
    await prisma.profSbEducationSubmission.upsert({
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
        profReport: profReport as unknown as Prisma.InputJsonValue,
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
        profReport: profReport as unknown as Prisma.InputJsonValue,
        accessInviteCode: normalizeAccessCode(payload.accessCode),
        candidateFolderKey,
      },
    });
  } catch (err) {
    screeningServerLog("prof_sb_education_submit", "db_error", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
      dbMs: Date.now() - dbStarted,
    });
    return NextResponse.json({ error: "Не удалось сохранить ответы" }, { status: 500 });
  }

  if (invite.status === "ok") {
    try {
      await markAccessCodeUsed(payload.accessCode, TEST_KIND_PROF_SB_EDUCATION);
    } catch (err) {
      screeningServerLog("prof_sb_education_submit", "access_code_mark_used_failed", {
        sessionRef,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  screeningServerLog("prof_sb_education_submit", "ok", {
    sessionRef,
    totalMs: Date.now() - startedAt,
    dbMs: Date.now() - dbStarted,
  });

  try {
    await finalizeProctorSessionIfNeeded(payload.sessionId, TEST_KIND_PROF_SB_EDUCATION);
  } catch (err) {
    screeningServerLog("prof_sb_education_submit", "proctor_finalize_failed", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Строит отчёт: step-4 summary если есть, иначе фиксация прохождения заглушки.
 */
function buildProfSbEducationReportFromAnswers(answers: unknown): {
  status: "pending_methodology" | "computed";
  sections: ReadonlyArray<"profSb" | "profEducation">;
  computedAt: string;
  interpretation: string | null;
} {
  const step4 = extractStep4Data(answers);
  if (step4) {
    const summary = buildStep4AiSummary(step4);
    return {
      status: summary.trim().length > 0 ? "computed" : "pending_methodology",
      sections: ["profSb", "profEducation"],
      computedAt: formatMoscowNow(),
      interpretation: summary.trim().length > 0 ? summary.slice(0, 12000) : null,
    };
  }

  const hasFilledFields = countFilledAnswerFields(answers) > 0;
  if (hasFilledFields) {
    return {
      ...buildPendingProfSbEducationReport(),
      computedAt: formatMoscowNow(),
      interpretation: "Ответы сохранены. Полная интерпретация появится после подключения ключей методики.",
    };
  }

  return {
    status: "computed",
    sections: ["profSb", "profEducation"],
    computedAt: formatMoscowNow(),
    interpretation:
      "Прохождение зафиксировано. Вопросы анкеты ещё не были подключены на момент сдачи — сохранён факт завершения.",
  };
}

function extractStep4Data(answers: unknown): Step4Data | null {
  if (!answers || typeof answers !== "object") {
    return null;
  }
  const root = answers as { step4Data?: unknown; source?: unknown };
  if (root.step4Data && typeof root.step4Data === "object") {
    return root.step4Data as Step4Data;
  }
  return null;
}

function countFilledAnswerFields(answers: unknown): number {
  if (!answers || typeof answers !== "object") {
    return 0;
  }
  let count = 0;
  const walk = (value: unknown): void => {
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === "string") {
      if (value.trim().length > 0) {
        count += 1;
      }
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      count += 1;
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (typeof value === "object") {
      for (const item of Object.values(value as Record<string, unknown>)) {
        walk(item);
      }
    }
  };
  walk(answers);
  return count;
}
