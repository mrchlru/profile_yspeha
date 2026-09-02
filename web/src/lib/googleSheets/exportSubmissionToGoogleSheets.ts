import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import {
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_BURNOUT,
  TEST_KIND_SCREENING,
  isAuditDevInvite,
  type TestKind,
} from "@/lib/access/testKinds";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import {
  buildGoogleSheetsAuditMetrics,
  buildGoogleSheetsBurnoutMetrics,
  buildGoogleSheetsDataRow,
  type GoogleSheetsCandidateMeta,
} from "@/lib/googleSheets/buildGoogleSheetsExportRow";
import {
  appendGoogleSheetRow,
  createGoogleSheetsClientFromEnv,
  ensureGoogleSheetTab,
  getGoogleSheetTabId,
  initializeGoogleSheetTabHeaders,
  readGoogleSheetFirstCell,
  countGoogleSheetDataRows,
} from "@/lib/googleSheets/googleSheetsClient";
import { readGoogleSheetsConfigFromEnv } from "@/lib/googleSheets/googleSheetsConfig";
import { googleSheetsSchemaForTestKind } from "@/lib/googleSheets/googleSheetsSheetSchemas";
import {
  googleSheetsNextSequenceNumber,
  isGoogleSheetsHeaderReady,
} from "@/lib/googleSheets/googleSheetsSheetLayout";
import type { MaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { formatMoscowDate, formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";

export type ExportAuditToGoogleSheetsInput = {
  testKind: TestKind;
  devMode: boolean;
  accessCode: string;
  firstName: string;
  lastName: string;
  submittedAt: Date;
  answers: AuditAnswersMap;
};

export type ExportBurnoutToGoogleSheetsInput = {
  devMode: boolean;
  accessCode: string;
  firstName: string;
  lastName: string;
  submittedAt: Date;
  scores: MaslachBurnoutScores;
};

/**
 * Выгружает результаты аудита на лист Google Sheets (не блокирует submit при ошибке).
 */
export async function exportAuditSubmissionToGoogleSheets(
  input: ExportAuditToGoogleSheetsInput
): Promise<void> {
  if (isAuditDevInvite(input.testKind, input.devMode)) {
    return;
  }
  const schema = googleSheetsSchemaForTestKind(input.testKind);
  if (schema === null) {
    return;
  }

  const metrics = buildGoogleSheetsAuditMetrics(input.answers, {
    includeSectarianism:
      input.testKind === TEST_KIND_SCREENING || input.testKind === TEST_KIND_AUDIT_MIDDLE,
    includeManagementBattery:
      input.testKind === TEST_KIND_AUDIT_MIDDLE || input.testKind === TEST_KIND_AUDIT_SENIOR,
  });

  const candidate = await _loadCandidateMeta({
    accessCode: input.accessCode,
    firstName: input.firstName,
    lastName: input.lastName,
    submittedAt: input.submittedAt,
  });

  await _appendMetricsRow(schema, candidate, metrics);
}

/**
 * Выгружает standalone-тест на выгорание.
 */
export async function exportBurnoutSubmissionToGoogleSheets(
  input: ExportBurnoutToGoogleSheetsInput
): Promise<void> {
  if (input.devMode) {
    return;
  }
  const schema = googleSheetsSchemaForTestKind(TEST_KIND_BURNOUT);
  if (schema === null) {
    return;
  }

  const metrics = buildGoogleSheetsBurnoutMetrics(input.scores);
  const candidate = await _loadCandidateMeta({
    accessCode: input.accessCode,
    firstName: input.firstName,
    lastName: input.lastName,
    submittedAt: input.submittedAt,
  });

  await _appendMetricsRow(schema, candidate, metrics);
}

/** Запускает выгрузку аудита в фоне с логированием ошибок. */
export function scheduleAuditGoogleSheetsExport(input: ExportAuditToGoogleSheetsInput): void {
  void exportAuditSubmissionToGoogleSheets(input).catch((error: unknown) => {
    screeningServerLog("google_sheets_export", "audit_failed", {
      testKind: input.testKind,
      errorName: error instanceof Error ? error.name : "unknown",
    });
  });
}

/** Запускает выгрузку выгорания в фоне. */
export function scheduleBurnoutGoogleSheetsExport(input: ExportBurnoutToGoogleSheetsInput): void {
  void exportBurnoutSubmissionToGoogleSheets(input).catch((error: unknown) => {
    screeningServerLog("google_sheets_export", "burnout_failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
  });
}

async function _appendMetricsRow(
  schema: NonNullable<ReturnType<typeof googleSheetsSchemaForTestKind>>,
  candidate: GoogleSheetsCandidateMeta,
  metrics: Record<string, string | number>
): Promise<void> {
  const config = readGoogleSheetsConfigFromEnv();
  if (config === null) {
    return;
  }

  const sheets = createGoogleSheetsClientFromEnv();
  const sheetTitle = schema.sheetTitle;
  await ensureGoogleSheetTab({
    sheets,
    spreadsheetId: config.spreadsheetId,
    sheetTitle,
  });

  const firstCell = await readGoogleSheetFirstCell({
    sheets,
    spreadsheetId: config.spreadsheetId,
    sheetTitle,
  });
  if (!isGoogleSheetsHeaderReady(firstCell)) {
    const sheetId = await getGoogleSheetTabId({
      sheets,
      spreadsheetId: config.spreadsheetId,
      sheetTitle,
    });
    await initializeGoogleSheetTabHeaders({
      sheets,
      spreadsheetId: config.spreadsheetId,
      sheetTitle,
      sheetId,
      schema,
    });
  }

  const dataRowCount = await countGoogleSheetDataRows({
    sheets,
    spreadsheetId: config.spreadsheetId,
    sheetTitle,
  });
  const sequenceNumber = googleSheetsNextSequenceNumber(dataRowCount);
  const row = buildGoogleSheetsDataRow({
    schema,
    sequenceNumber,
    candidate,
    metrics,
  });

  await appendGoogleSheetRow({
    sheets,
    spreadsheetId: config.spreadsheetId,
    sheetName: sheetTitle,
    values: row,
  });

  screeningServerLog("google_sheets_export", "row_appended", {
    sheetTitle,
    sequenceNumber,
  });
}

async function _loadCandidateMeta(input: {
  accessCode: string;
  firstName: string;
  lastName: string;
  submittedAt: Date;
}): Promise<GoogleSheetsCandidateMeta> {
  const invite = await prisma.accessInvite.findFirst({
    where: { code: normalizeAccessCode(input.accessCode) },
    select: {
      candidateBirthDate: true,
      candidateLastName: true,
      candidateFirstName: true,
      candidateMiddleName: true,
    },
  });

  const lastName = invite?.candidateLastName?.trim() || input.lastName.trim();
  const firstName = invite?.candidateFirstName?.trim() || input.firstName.trim();
  const middleName = invite?.candidateMiddleName?.trim() ?? "";
  const fullName = [lastName, firstName, middleName].filter(Boolean).join(" ");

  return {
    fullName,
    birthDate:
      invite?.candidateBirthDate !== null && invite?.candidateBirthDate !== undefined
        ? formatMoscowDate(invite.candidateBirthDate)
        : "",
    submittedAt: formatMoscowDateTime(input.submittedAt),
  };
}
