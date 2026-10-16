import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import {
  assertFolderReportSession,
  type FolderReportSource,
} from "@/lib/admin/folderReportSessions";
import {
  reportPdfSourceFromKind,
  resolveFolderReportSessionSource,
  resolveReportPdfKind,
} from "@/lib/admin/buildReportHtmlView";
import { documentReportSourceCandidates } from "@/lib/admin/documentReportSource";
import { generateExecutiveManagerReportPdfBySession } from "@/lib/admin/generateExecutiveManagerReportBySession";
import { regenerateAuditSubmissionBySession } from "@/lib/admin/regenerateAuditSubmissionBySession";
import { regenerateScreeningSubmissionBySession } from "@/lib/admin/regenerateScreeningSubmissionBySession";
import { assertAttestationSessionInFolder } from "@/lib/admin/buildAttestationReportView";
import { computeAttestationScores } from "@/lib/attestation/computeAttestationScores";
import type { AttestationAnswers } from "@/lib/attestation/attestationQuestions";
import {
  computeRosenzweigCodingSummary,
  type RosenzweigCodingMap,
} from "@/lib/attestation/rosenzweigCoding";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { computeMaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { buildMaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";
import type { MaslachBurnoutAnswers } from "@/lib/burnout/maslachBurnoutQuestions";
import type { BurnoutReportJson } from "@/lib/burnout/burnoutReportTypes";
import {
  buildComputedProfSbEducationReport,
  type ProfSbEducationReportJson,
} from "@/lib/profSbEducation/profSbEducationTypes";
import { buildStep4AiSummary } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";
import { deleteStoredReportPdfCopies } from "@/lib/admin/rebuildAuditSubmissionReport";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { SpecialistScreeningAnswers } from "@/lib/specialistScreening/specialistScreeningQuestions";
import { computeSpecialistScreeningScores } from "@/lib/specialistScreening/computeSpecialistScreeningScores";
import { buildSpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import type { SpecialistScreeningReportJson } from "@/lib/specialistScreening/specialistScreeningReportTypes";

export type RegenerateFolderDocumentReportResult = {
  ok: boolean;
  message: string;
};

export type RegenerateFolderDocumentReportInput = {
  folderKey: string;
  documentId: EmployeeDocumentSlotId;
  sessionId: string;
  /** ИИ-части (экспертный отчёт, managerBrief). */
  regenerateAi?: boolean;
};

/**
 * Перегенерирует отчёт документа папки сотрудника по sessionId.
 */
export async function regenerateFolderDocumentReport(
  input: RegenerateFolderDocumentReportInput
): Promise<RegenerateFolderDocumentReportResult> {
  const { folderKey, documentId, sessionId } = input;
  const regenerateAi = input.regenerateAi !== false;

  if (documentId === "violations_report") {
    return {
      ok: true,
      message:
        "Отчёт по нарушениям строится из актуальных данных прокторинга — обновите страницу для просмотра.",
    };
  }

  if (documentId === "attestation_report") {
    return regenerateAttestationReportInFolder(folderKey, sessionId, regenerateAi);
  }

  if (documentId === "resume" || documentId === "commission_reports") {
    return { ok: false, message: "Для этого типа документа перегенерация не поддерживается" };
  }

  const pdfKind = await resolveReportPdfKind(folderKey, documentId, sessionId);
  const sessionSource = await _resolveSessionSource(folderKey, documentId, sessionId, pdfKind);
  if (!sessionSource) {
    return { ok: false, message: "Сессия не найдена в этой папке" };
  }

  const allowed = await assertFolderReportSession(folderKey, sessionSource, sessionId);
  if (!allowed) {
    return { ok: false, message: "Сессия не найдена в этой папке" };
  }

  if (documentId === "executive_manager_report") {
    const execSource = sessionSource === "screening" ? "screening" : "audit";
    const pdf = await generateExecutiveManagerReportPdfBySession({
      sessionId,
      source: execSource,
      regenerate: regenerateAi,
    });
    await deleteStoredReportPdfCopies(sessionId, folderKey);
    if (!pdf || pdf.length === 0) {
      return {
        ok: false,
        message: "Не удалось сформировать экспертный PDF (нет данных или ошибка ИИ)",
      };
    }
    return { ok: true, message: "Экспертный отчёт пересобран и сохранён" };
  }

  if (sessionSource === "screening") {
    return regenerateScreeningSubmissionBySession(sessionId);
  }

  const withManagerBriefAi =
    regenerateAi &&
    (documentId === "short_report" ||
      documentId === "manager_report" ||
      documentId === "full_report" ||
      documentId === "dashboard");

  const auditResult = await regenerateAuditSubmissionBySession(sessionId, {
    withManagerBriefAi,
    withFullPdf: documentId === "full_report",
    withManagerPdf: documentId === "manager_report",
  });

  if (!auditResult.ok) {
    return auditResult;
  }

  if (documentId === "dashboard") {
    return {
      ok: true,
      message: `${auditResult.message}. Дашборд пересчитается из последней audit-сессии папки.`,
    };
  }

  return auditResult;
}

async function _resolveSessionSource(
  folderKey: string,
  documentId: EmployeeDocumentSlotId,
  sessionId: string,
  pdfKind: Awaited<ReturnType<typeof resolveReportPdfKind>>
): Promise<FolderReportSource | null> {
  if (pdfKind === "executive_manager") {
    return resolveFolderReportSessionSource(folderKey, documentId, sessionId);
  }
  if (pdfKind) {
    return reportPdfSourceFromKind(pdfKind);
  }
  const candidates = documentReportSourceCandidates(documentId, folderKey);
  for (const source of candidates) {
    const ok = await assertFolderReportSession(folderKey, source, sessionId);
    if (ok) {
      return source;
    }
  }
  return null;
}

async function regenerateAttestationReportInFolder(
  folderKey: string,
  sessionId: string,
  regenerateAi: boolean
): Promise<RegenerateFolderDocumentReportResult> {
  const allowed = await assertAttestationSessionInFolder(folderKey, sessionId);
  if (!allowed) {
    return { ok: false, message: "Сессия аттестации не найдена в этой папке" };
  }

  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: {
      answers: true,
      attestationReport: true,
      rosenzweigCoding: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!row?.answers || typeof row.answers !== "object") {
    return { ok: false, message: "Нет ответов аттестации для пересчёта" };
  }

  const answers = row.answers as AttestationAnswers;
  const coding =
    row.rosenzweigCoding && typeof row.rosenzweigCoding === "object"
      ? (row.rosenzweigCoding as RosenzweigCodingMap)
      : {};
  const codingSummary =
    Object.keys(coding).length > 0 ? computeRosenzweigCodingSummary(coding) : null;

  const stored =
    row.attestationReport && typeof row.attestationReport === "object"
      ? (row.attestationReport as unknown as AttestationReportJson)
      : null;

  const nextReport: AttestationReportJson = {
    scores: computeAttestationScores(answers),
    rosenzweigCodingSummary: codingSummary,
    rosenzweigCodingMeta: stored?.rosenzweigCodingMeta ?? null,
    computedAt: formatMoscowNow(),
    conclusionText: stored?.conclusionText ?? null,
    managerActions: stored?.managerActions ?? null,
    conclusionGeneratedAt: stored?.conclusionGeneratedAt ?? null,
  };

  await prisma.attestationSubmission.update({
    where: { sessionId },
    data: { attestationReport: nextReport as unknown as Prisma.InputJsonValue },
  });

  if (regenerateAi) {
    const { persistAttestationAiConclusion } = await import(
      "@/lib/attestation/persistAttestationAiConclusion"
    );
    const fullName = `${row.lastName} ${row.firstName}`.trim();
    const aiResult = await persistAttestationAiConclusion({
      sessionId,
      sessionRef: shortSessionRef(sessionId),
      personName: fullName,
    });
    if (!aiResult.aiGenerated) {
      return {
        ok: true,
        message: "Баллы пересчитаны; ИИ-заключение не удалось сгенерировать",
      };
    }
    return { ok: true, message: "Отчёт аттестации и ИИ-заключение обновлены" };
  }

  return { ok: true, message: "Баллы аттестации пересчитаны" };
}

/**
 * Перегенерирует отчёт выгорания по sessionId в папке.
 */
export async function regenerateBurnoutReportInFolder(
  folderKey: string,
  sessionId: string
): Promise<RegenerateFolderDocumentReportResult> {
  const row = await prisma.burnoutSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { sessionId: true, answers: true, candidateFolderKey: true },
  });
  if (!row) {
    return { ok: false, message: "Сессия выгорания не найдена" };
  }

  const scores = computeMaslachBurnoutScores(row.answers as MaslachBurnoutAnswers);
  const interpretation = buildMaslachBurnoutInterpretation(scores);
  const burnoutReport: BurnoutReportJson = {
    scores,
    interpretation,
    computedAt: formatMoscowNow(),
  };

  await prisma.burnoutSubmission.update({
    where: { sessionId: row.sessionId },
    data: { burnoutReport: burnoutReport as unknown as Prisma.InputJsonValue },
  });
  await deleteStoredReportPdfCopies(row.sessionId, row.candidateFolderKey);

  return { ok: true, message: "Отчёт выгорания пересчитан" };
}

/**
 * Перегенерирует отчёт ПРОФ СБ + образование.
 */
export async function regenerateProfSbEducationReportInFolder(
  folderKey: string,
  sessionId: string
): Promise<RegenerateFolderDocumentReportResult> {
  const row = await prisma.profSbEducationSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { sessionId: true, answers: true, candidateFolderKey: true },
  });
  if (!row) {
    return { ok: false, message: "Сессия не найдена" };
  }

  const profReport = _rebuildProfSbEducationReport(row.answers);
  await prisma.profSbEducationSubmission.update({
    where: { sessionId: row.sessionId },
    data: { profReport: profReport as unknown as Prisma.InputJsonValue },
  });
  await deleteStoredReportPdfCopies(row.sessionId, row.candidateFolderKey);

  return { ok: true, message: "Отчёт ПРОФ СБ + образование пересобран" };
}

/**
 * Пересчитывает JSON отчёта скрининга направления к специалисту.
 */
export async function regenerateSpecialistScreeningReportInFolder(
  folderKey: string,
  sessionId: string
): Promise<RegenerateFolderDocumentReportResult> {
  const row = await prisma.specialistScreeningSubmission.findFirst({
    where: { sessionId, candidateFolderKey: folderKey },
    select: { sessionId: true, answers: true, specialistScreeningReport: true },
  });
  if (!row?.answers || typeof row.answers !== "object") {
    return { ok: false, message: "Сессия скрининга не найдена или нет ответов" };
  }

  const stored =
    row.specialistScreeningReport && typeof row.specialistScreeningReport === "object"
      ? (row.specialistScreeningReport as unknown as SpecialistScreeningReportJson)
      : null;

  const answers = row.answers as SpecialistScreeningAnswers;
  const scores = computeSpecialistScreeningScores(answers);
  const interpretation = buildSpecialistScreeningInterpretation(scores);
  const nextReport: SpecialistScreeningReportJson = {
    scores,
    interpretation,
    computedAt: formatMoscowNow(),
    conclusionText: stored?.conclusionText ?? null,
    managerActions: stored?.managerActions ?? null,
    conclusionGeneratedAt: stored?.conclusionGeneratedAt ?? null,
  };

  await prisma.specialistScreeningSubmission.update({
    where: { sessionId: row.sessionId },
    data: { specialistScreeningReport: nextReport as unknown as Prisma.InputJsonValue },
  });

  return { ok: true, message: "Отчёт скрининга пересчитан" };
}

function _rebuildProfSbEducationReport(answers: unknown): ProfSbEducationReportJson {
  const base = buildComputedProfSbEducationReport(null);
  if (answers === null || typeof answers !== "object") {
    return { ...base, computedAt: formatMoscowNow() };
  }
  const record = answers as { step4Data?: Step4Data; source?: string };
  if (record.step4Data !== undefined) {
    const summary = buildStep4AiSummary(record.step4Data);
    return {
      status: "computed",
      sections: ["profSb", "profEducation"],
      computedAt: formatMoscowNow(),
      interpretation: summary.trim().length > 0 ? summary.slice(0, 12000) : null,
    };
  }
  return { ...base, computedAt: formatMoscowNow() };
}
