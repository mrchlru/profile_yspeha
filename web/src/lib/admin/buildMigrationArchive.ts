import { zipSync } from "fflate";

import {
  MIGRATION_ARCHIVE_MANIFEST_FILE,
  MIGRATION_ARCHIVE_VERSION,
  MIGRATION_TABLE_ORDER,
  type MigrationArchiveManifest,
  type MigrationTableName,
} from "@/lib/admin/migrationArchiveTypes";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 100;

/**
 * Собирает ZIP-архив всех пользовательских данных для переноса между инстансами.
 */
export async function buildMigrationArchiveZip(): Promise<{
  buffer: Buffer;
  manifest: MigrationArchiveManifest;
}> {
  const files: Record<string, Uint8Array> = {};
  const tableStats: MigrationArchiveManifest["tables"] = [];

  for (const tableName of MIGRATION_TABLE_ORDER) {
    const rows = await _loadAllRows(tableName);
    const ndjson = rows.map((row) => JSON.stringify(_serializeRow(row))).join("\n");
    files[`tables/${tableName}.ndjson`] = _utf8(ndjson);
    tableStats.push({ name: tableName, rowCount: rows.length });
  }

  const manifest: MigrationArchiveManifest = {
    version: MIGRATION_ARCHIVE_VERSION,
    exportedAt: formatMoscowNow(),
    source: process.env.APP_URL?.trim() || "unknown",
    tables: tableStats,
  };
  files[MIGRATION_ARCHIVE_MANIFEST_FILE] = _utf8(JSON.stringify(manifest, null, 2));

  return {
    buffer: Buffer.from(zipSync(files, { level: 6 })),
    manifest,
  };
}

async function _loadAllRows(tableName: MigrationTableName): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let skip = 0;
  for (;;) {
    const batch = await _findBatch(tableName, skip, BATCH_SIZE);
    if (batch.length === 0) {
      break;
    }
    for (const row of batch) {
      out.push(row as Record<string, unknown>);
    }
    if (batch.length < BATCH_SIZE) {
      break;
    }
    skip += BATCH_SIZE;
  }
  return out;
}

async function _findBatch(
  tableName: MigrationTableName,
  skip: number,
  take: number
): Promise<object[]> {
  switch (tableName) {
    case "candidate_folder_record":
      return prisma.candidateFolderRecord.findMany({ skip, take, orderBy: { folderKey: "asc" } });
    case "folder_archive_mark":
      return prisma.folderArchiveMark.findMany({ skip, take, orderBy: { folderKey: "asc" } });
    case "interview_folder":
      return prisma.interviewFolder.findMany({ skip, take, orderBy: { key: "asc" } });
    case "access_invite":
      return prisma.accessInvite.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "admin_app_settings":
      return prisma.adminAppSettings.findMany({ skip, take });
    case "commission_question":
      return prisma.commissionQuestion.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "interview_commission_member":
      return prisma.interviewCommissionMember.findMany({
        skip,
        take,
        orderBy: { createdAt: "asc" },
      });
    case "screening_submission":
      return prisma.screeningSubmission.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "audit_submission":
      return prisma.auditSubmission.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "burnout_submission":
      return prisma.burnoutSubmission.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "prof_sb_education_submission":
      return prisma.profSbEducationSubmission.findMany({
        skip,
        take,
        orderBy: { createdAt: "asc" },
      });
    case "burnout_reminder_schedule":
      return prisma.burnoutReminderSchedule.findMany({
        skip,
        take,
        orderBy: { createdAt: "asc" },
      });
    case "employee_folder_file":
      return prisma.employeeFolderFile.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "commission_member_question_set":
      return prisma.commissionMemberQuestionSet.findMany({
        skip,
        take,
        orderBy: { createdAt: "asc" },
      });
    case "commission_eval_sheet":
      return prisma.commissionEvalSheet.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "commission_candidate_conclusion":
      return prisma.commissionCandidateConclusion.findMany({
        skip,
        take,
        orderBy: { createdAt: "asc" },
      });
    case "commission_eval_save_failure_log":
      return prisma.commissionEvalSaveFailureLog.findMany({
        skip,
        take,
        orderBy: { createdAt: "asc" },
      });
    case "proctor_session":
      return prisma.proctorSession.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "proctor_session_audio":
      return prisma.proctorSessionAudio.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "proctor_event":
      return prisma.proctorEvent.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "proctor_audio_clip":
      return prisma.proctorAudioClip.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    case "proctor_snapshot":
      return prisma.proctorSnapshot.findMany({ skip, take, orderBy: { createdAt: "asc" } });
    default: {
      const _exhaustive: never = tableName;
      return _exhaustive;
    }
  }
}

/**
 * Сериализует строку БД в JSON-совместимый объект (даты и Bytes).
 */
function _serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = _serializeValue(value);
  }
  return out;
}

function _serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }
  if (Buffer.isBuffer(value)) {
    return { $bytes: value.toString("base64") };
  }
  if (value instanceof Uint8Array) {
    return { $bytes: Buffer.from(value).toString("base64") };
  }
  if (Array.isArray(value)) {
    return value.map((item) => _serializeValue(item));
  }
  if (typeof value === "object") {
    // Prisma Json / plain object
    return value;
  }
  return value;
}

function _utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
