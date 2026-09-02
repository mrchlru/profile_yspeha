import { Prisma } from "@/generated/prisma/client";
import type { AccessInviteCheckResult } from "@/lib/access/findActiveInvite";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { isTestKind, TEST_KIND_LABELS, TEST_KIND_STATE_AUDIT, type TestKind } from "@/lib/access/testKinds";
import type { AuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { buildAuditAiPipelinePayload } from "@/lib/ai/audit/buildAuditAiPipelinePayload";
import { renderAuditHrReport } from "@/lib/ai/audit/renderAuditHrReport";
import { generateAuditConclusion } from "@/lib/ai/auditConclusion";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { buildAuditManagerBrief } from "@/lib/audit/report/buildAuditManagerBrief";
import { buildAuditReportJson } from "@/lib/audit/report/buildAuditReportData";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import { resolveAuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import {
  resolveManagerBriefConclusion,
} from "@/lib/audit/report/resolveManagerBriefConclusion";
import { rebuildManagerBriefWithPsychAi } from "@/lib/audit/report/rebuildManagerBriefWithPsychAi";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import { buildBurnoutPiAlertSummary } from "@/lib/burnout/burnoutPiCritical";
import { trySendPiExhaustionAlert } from "@/lib/burnout/trySendPiExhaustionAlert";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { sendAuditReportEmail } from "@/lib/email/sendAuditReportEmail";
import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { scheduleAuditGoogleSheetsExport } from "@/lib/googleSheets/exportSubmissionToGoogleSheets";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { saveProfSbEducationFromAuditSubmit } from "@/lib/profSbEducation/saveProfSbEducationFromAuditSubmit";
import { prisma } from "@/lib/prisma";
import { generateAuditManagerPdfBuffer, generateAuditPdfBuffer } from "@/lib/report/generateAuditPdf";
import type { Step4Data } from "@/lib/step4/step4Types";
import type { z } from "zod";
import type { auditSubmitBodySchema } from "@/lib/validation/auditSubmitSchema";

type AuditSubmitPayload = z.infer<typeof auditSubmitBodySchema>;

export type RunAuditSubmitReportPipelineInput = {
  payload: AuditSubmitPayload;
  sessionRef: string;
  assessee: AuditAssesseeKey;
  invite: AccessInviteCheckResult;
  consentAt: Date;
  submitTestKind: TestKind | null;
  pipelineStartedAt: number;
};

/**
 * Фоновый пайплайн: ИИ, PDF, email и сохранение auditReport после быстрого submit.
 */
export async function runAuditSubmitReportPipeline(
  input: RunAuditSubmitReportPipelineInput
): Promise<void> {
  const { payload, sessionRef, assessee, consentAt, submitTestKind, pipelineStartedAt } = input;

  const answersMap = parseAuditAnswersPayload(
    payload.answers as Record<string, Record<string, unknown>>
  );

  const prevRow = await prisma.auditSubmission.findFirst({
    where: {
      assesseeKey: assessee.key,
      NOT: { sessionId: payload.sessionId },
    },
    orderBy: { createdAt: "desc" },
    select: { sessionId: true, createdAt: true, auditReport: true },
  });

  const previous =
    prevRow !== null
      ? {
          sessionId: prevRow.sessionId,
          createdAt: prevRow.createdAt,
          auditReport: prevRow.auditReport,
        }
      : null;

  const reportProfile = resolveAuditReportProfile(submitTestKind);

  if (
    (reportProfile === "tu_management_chef" || reportProfile === "candidate_screening") &&
    payload.step4Data
  ) {
    const inviteMeta = await prisma.accessInvite.findFirst({
      where: { code: normalizeAccessCode(payload.accessCode) },
      select: { candidateFolderKey: true },
    });
    try {
      await saveProfSbEducationFromAuditSubmit({
        sessionId: payload.sessionId,
        accessCode: payload.accessCode,
        assessee,
        consentRecordedAt: consentAt,
        step4Data: payload.step4Data as Step4Data,
        candidateFolderKey: inviteMeta?.candidateFolderKey ?? null,
      });
      screeningServerLog("audit_submit", "prof_sb_saved", { sessionRef });
    } catch (err) {
      screeningServerLog("audit_submit", "prof_sb_save_failed", {
        sessionRef,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  const report = buildAuditReportJson({
    answers: answersMap,
    previous,
    aiDraft: {
      conclusion: null,
      yearOverYearDynamics: null,
      generatedAt: null,
      structured: null,
    },
    deliveryDraft: { emailSent: false, pdfGenerated: false },
    reportProfile,
    step4Data: payload.step4Data as Step4Data | undefined,
  });

  const fullName = `${assessee.lastNameDisplay} ${assessee.firstNameDisplay}`;
  const pipelinePayload = buildAuditAiPipelinePayload({
    fullName,
    sessionId: payload.sessionId,
    assesseeKey: assessee.key,
    answers: answersMap,
    report,
    reportProfile,
  });

  const aiStarted = Date.now();
  let conclusion: string | null = null;
  let yearOverYearDynamics: string | null = null;
  let structured: AuditReportJson["ai"]["structured"] = null;
  let aiGeneratedAt: string | null = null;
  try {
    const ai = await generateAuditConclusion({ pipelinePayload, sessionRef });
    yearOverYearDynamics = ai.yearOverYearDynamics;
    structured = ai.structured;
    if (structured !== null) {
      conclusion = renderAuditHrReport(structured, report.conclusion).slice(0, 24000);
      aiGeneratedAt = formatMoscowNow();
    }
    screeningServerLog("audit_submit", "ai_finished", {
      sessionRef,
      ok: conclusion !== null,
      durationMs: Date.now() - aiStarted,
    });
  } catch (err) {
    screeningServerLog("audit_submit", "ai_exception", {
      sessionRef,
      durationMs: Date.now() - aiStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  report.ai = {
    conclusion,
    yearOverYearDynamics,
    generatedAt: aiGeneratedAt,
    structured,
  };
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnoutScores = computeBurnoutScores(
    burnoutStep ? answersMap[burnoutStep.stepIndex] : undefined
  );
  report.burnoutPiAlert = buildBurnoutPiAlertSummary(burnoutScores);
  const submitReportProfile: AuditReportProfile =
    report.reportProfile ?? "full_state_audit";

  if (
    submitReportProfile === "od_reserve" ||
    submitReportProfile === "tu_management_chef"
  ) {
    const { managerBrief } = await rebuildManagerBriefWithPsychAi({
      answers: answersMap,
      testBlocks: report.testBlocks,
      narrativeSections: report.narrativeSections,
      reportProfile: submitReportProfile,
      sessionRef,
      useAi: true,
      existingAiConclusion: structured?.managerBriefConclusion ?? null,
    });
    report.managerBrief = managerBrief;
  } else {
    const managerConclusionForBrief = resolveManagerBriefConclusion(
      answersMap,
      submitReportProfile,
      structured?.managerBriefConclusion ?? null
    );
    report.managerBrief = buildAuditManagerBrief(
      report.testBlocks,
      report.narrativeSections,
      managerConclusionForBrief,
      burnoutScores,
      answersMap,
      report.reportProfile
    );
  }

  let pdfBuffer: Buffer | null = null;
  const pdfStarted = Date.now();
  try {
    pdfBuffer = await generateAuditPdfBuffer({
      fullName,
      sessionId: payload.sessionId,
      report,
    });
    report.delivery.pdfGenerated = true;
    screeningServerLog("audit_submit", "pdf_ok", {
      sessionRef,
      bytes: pdfBuffer.length,
      durationMs: Date.now() - pdfStarted,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    screeningServerLog("audit_submit", "pdf_failed", {
      sessionRef,
      durationMs: Date.now() - pdfStarted,
      errorName: err instanceof Error ? err.name : "unknown",
      errorMessage: msg.length > 400 ? `${msg.slice(0, 400)}…` : msg,
    });
    report.delivery.pdfGenerated = false;
  }

  try {
    const managerPdfBuffer = await generateAuditManagerPdfBuffer({
      fullName,
      sessionId: payload.sessionId,
      report,
    });
    report.delivery.managerPdfGenerated = managerPdfBuffer.length > 0;
  } catch {
    report.delivery.managerPdfGenerated = false;
  }

  const emailStarted = Date.now();
  let emailSent = false;
  try {
    emailSent = await sendAuditReportEmail({
      sessionId: payload.sessionId,
      sessionRef,
      fullName,
      conclusionText: conclusion,
      yearOverYearText: yearOverYearDynamics,
      reportPdfBuffer: pdfBuffer,
    });
    screeningServerLog("audit_submit", "email_finished", {
      sessionRef,
      sent: emailSent,
      durationMs: Date.now() - emailStarted,
    });
  } catch (err) {
    const smtpFields = smtpErrorLogFields(err);
    screeningServerLog("audit_submit", "email_exception", {
      sessionRef,
      durationMs: Date.now() - emailStarted,
      errorName: smtpFields.errorName,
      errorMessage: smtpFields.errorMessage,
      responseCode: smtpFields.responseCode ?? undefined,
    });
    emailSent = false;
  }
  report.delivery.emailSent = emailSent;

  const testLabel = await _resolveAuditTestLabel(payload.accessCode);
  try {
    const piAlertSent = await trySendPiExhaustionAlert({
      sessionRef,
      personName: fullName,
      testLabel,
      burnoutPiAlert: report.burnoutPiAlert,
    });
    screeningServerLog("audit_submit", "pi_alert_finished", {
      sessionRef,
      sent: piAlertSent,
      critical: report.burnoutPiAlert?.critical === true,
    });
  } catch (err) {
    screeningServerLog("audit_submit", "pi_alert_exception", {
      sessionRef,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  const reportStarted = Date.now();
  try {
    await prisma.auditSubmission.update({
      where: { sessionId: payload.sessionId },
      data: { auditReport: report as unknown as Prisma.InputJsonValue },
    });
    screeningServerLog("audit_submit", "audit_report_saved", {
      sessionRef,
      durationMs: Date.now() - reportStarted,
    });
  } catch (err) {
    screeningServerLog("audit_submit", "audit_report_save_failed", {
      sessionRef,
      durationMs: Date.now() - reportStarted,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }

  screeningServerLog("audit_submit", "background_success", {
    sessionRef,
    totalDurationMs: Date.now() - pipelineStartedAt,
  });

  if (submitTestKind !== null) {
    const inviteDevRow = await prisma.accessInvite.findFirst({
      where: { code: normalizeAccessCode(payload.accessCode) },
      select: { devMode: true },
    });
    scheduleAuditGoogleSheetsExport({
      testKind: submitTestKind,
      devMode: inviteDevRow?.devMode === true,
      accessCode: payload.accessCode,
      firstName: assessee.firstNameDisplay,
      lastName: assessee.lastNameDisplay,
      submittedAt: new Date(),
      answers: answersMap,
    });
  }
}

async function _resolveAuditTestLabel(accessCode: string): Promise<string> {
  const row = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(accessCode) },
    select: { testKind: true },
  });
  if (row !== null && isTestKind(row.testKind)) {
    return TEST_KIND_LABELS[row.testKind];
  }
  return TEST_KIND_LABELS[TEST_KIND_STATE_AUDIT];
}
