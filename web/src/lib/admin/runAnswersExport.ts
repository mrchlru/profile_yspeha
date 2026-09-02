import { buildAnswersComparisonExport } from "@/lib/admin/buildAnswersComparisonCsv";
import { buildReportExportZip } from "@/lib/admin/buildReportExportZip";
import { fetchRawAnswersRecords } from "@/lib/admin/fetchRawAnswersRecords";
import {
  formatReportExportFileStem,
  dedupeReportExportFileNames,
} from "@/lib/admin/formatReportExportFileName";
import {
  listReportExportCandidates,
  resolveReportExportSessionsByFolderKeys,
} from "@/lib/admin/listReportExportCandidates";
import type { AnswersExportFormat, AnswersExportTableLayout } from "@/lib/admin/answersExportKinds";
import type { ReportExportScope, ReportExportTestKind } from "@/lib/admin/reportExportKinds";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";

export type AnswersExportRequest = {
  scope: ReportExportScope;
  testKind: ReportExportTestKind;
  format: AnswersExportFormat;
  tableLayout: AnswersExportTableLayout;
  sessionIds?: ReadonlyArray<string>;
  folderKeys?: ReadonlyArray<string>;
};

export type AnswersExportSuccess = {
  fileName: string;
  buffer: Buffer;
  contentType: string;
};

/**
 * Формирует CSV и/или JSON с сырыми ответами из БД.
 */
export async function runAnswersExport(
  request: AnswersExportRequest
): Promise<AnswersExportSuccess | null> {
  const sessionIds = await _resolveSessionIds(request);
  if (sessionIds.length === 0) {
    return null;
  }

  const records = await fetchRawAnswersRecords(request.testKind, sessionIds);
  if (records.length === 0) {
    return null;
  }

  const stamp = formatMoscowDateTime(new Date()).replace(/[:\s]/g, "-").slice(0, 10);
  const baseName = `otvety_${request.testKind}_${stamp}`;

  const csvPayload = buildAnswersComparisonExport(records, {
    layout: request.tableLayout,
  });

  if (request.format === "csv") {
    return _csvSuccess(baseName, csvPayload);
  }

  const jsonEntries = _buildJsonEntries(records);
  if (request.format === "json") {
    if (jsonEntries.length === 1) {
      const only = jsonEntries[0]!;
      return {
        fileName: only.fileName,
        buffer: only.data,
        contentType: "application/json; charset=utf-8",
      };
    }
    return {
      fileName: `${baseName}.zip`,
      buffer: buildReportExportZip(jsonEntries),
      contentType: "application/zip",
    };
  }

  const csvEntries = _csvZipEntries(baseName, csvPayload);
  const zipEntries = [...csvEntries, ...jsonEntries];
  return {
    fileName: `${baseName}.zip`,
    buffer: buildReportExportZip(zipEntries),
    contentType: "application/zip",
  };
}

async function _resolveSessionIds(request: AnswersExportRequest): Promise<string[]> {
  if (request.scope === "all_latest") {
    const candidates = await listReportExportCandidates(request.testKind);
    return candidates.map((item) => item.sessionId);
  }

  const bySession = new Set<string>();

  if (request.sessionIds && request.sessionIds.length > 0) {
    for (const id of request.sessionIds) {
      bySession.add(id);
    }
  }

  if (request.folderKeys && request.folderKeys.length > 0) {
    const fromFolders = await resolveReportExportSessionsByFolderKeys(
      request.testKind,
      request.folderKeys
    );
    for (const item of fromFolders) {
      bySession.add(item.sessionId);
    }
  }

  return [...bySession];
}

function _buildJsonEntries(
  records: Awaited<ReturnType<typeof fetchRawAnswersRecords>>
): Array<{ fileName: string; data: Buffer }> {
  const stems = records.map((record) =>
    formatReportExportFileStem(record.lastName, record.firstName, record.completedAtDate)
  );
  const uniqueStems = dedupeReportExportFileNames(stems.map((stem) => `${stem}.json`)).map((name) =>
    name.replace(/\.json$/, "")
  );

  return records.map((record, index) => {
    const stem = uniqueStems[index] ?? record.sessionId;
    const payload = {
      meta: {
        sessionId: record.sessionId,
        testKind: record.testKind,
        lastName: record.lastName,
        firstName: record.firstName,
        completedAt: record.completedAt,
        folderKey: record.folderKey,
      },
      answers: record.answers,
    };
    return {
      fileName: `${stem}.json`,
      data: Buffer.from(JSON.stringify(payload, null, 2), "utf-8"),
    };
  });
}

function _csvSuccess(
  baseName: string,
  csvPayload: Buffer | Array<{ fileName: string; data: Buffer }>
): AnswersExportSuccess {
  if (Buffer.isBuffer(csvPayload)) {
    return {
      fileName: `${baseName}.csv`,
      buffer: csvPayload,
      contentType: "text/csv; charset=utf-8",
    };
  }

  if (csvPayload.length === 1) {
    const only = csvPayload[0]!;
    return {
      fileName: only.fileName,
      buffer: only.data,
      contentType: "text/csv; charset=utf-8",
    };
  }

  const dedupedNames = dedupeReportExportFileNames(csvPayload.map((entry) => entry.fileName));
  const entries = csvPayload.map((entry, index) => ({
    fileName: dedupedNames[index] ?? entry.fileName,
    data: entry.data,
  }));

  return {
    fileName: `${baseName}.zip`,
    buffer: buildReportExportZip(entries),
    contentType: "application/zip",
  };
}

function _csvZipEntries(
  baseName: string,
  csvPayload: Buffer | Array<{ fileName: string; data: Buffer }>
): Array<{ fileName: string; data: Buffer }> {
  if (Buffer.isBuffer(csvPayload)) {
    return [{ fileName: `${baseName}.csv`, data: csvPayload }];
  }
  const dedupedNames = dedupeReportExportFileNames(csvPayload.map((entry) => entry.fileName));
  return csvPayload.map((entry, index) => ({
    fileName: dedupedNames[index] ?? entry.fileName,
    data: entry.data,
  }));
}
