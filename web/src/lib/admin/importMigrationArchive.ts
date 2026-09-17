import { unzipSync } from "fflate";

import {
  MIGRATION_ARCHIVE_MANIFEST_FILE,
  MIGRATION_ARCHIVE_VERSION,
  MIGRATION_TABLE_ORDER,
  type MigrationArchiveManifest,
  type MigrationImportMode,
  type MigrationImportResult,
  type MigrationImportTableResult,
  type MigrationTableName,
} from "@/lib/admin/migrationArchiveTypes";
import { prisma } from "@/lib/prisma";

/**
 * Импортирует миграционный ZIP в текущую БД.
 */
export async function importMigrationArchiveZip(input: {
  zipBytes: Uint8Array;
  mode: MigrationImportMode;
}): Promise<MigrationImportResult> {
  const files = unzipSync(input.zipBytes);
  const manifestRaw = files[MIGRATION_ARCHIVE_MANIFEST_FILE];
  if (!manifestRaw) {
    throw new Error(`В архиве нет ${MIGRATION_ARCHIVE_MANIFEST_FILE}`);
  }

  const manifest = JSON.parse(new TextDecoder().decode(manifestRaw)) as MigrationArchiveManifest;
  if (manifest.version !== MIGRATION_ARCHIVE_VERSION) {
    throw new Error(
      `Неподдерживаемая версия архива: ${String(manifest.version)} (ожидается ${String(MIGRATION_ARCHIVE_VERSION)})`
    );
  }

  const tableResults: MigrationImportTableResult[] = [];
  for (const tableName of MIGRATION_TABLE_ORDER) {
    const fileBytes = files[`tables/${tableName}.ndjson`];
    if (!fileBytes) {
      tableResults.push({
        name: tableName,
        read: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      });
      continue;
    }
    const text = new TextDecoder().decode(fileBytes).trim();
    const lines = text.length === 0 ? [] : text.split("\n");
    const result = await _importTableRows(tableName, lines, input.mode);
    tableResults.push(result);
  }

  return {
    version: manifest.version,
    mode: input.mode,
    tables: tableResults,
  };
}

async function _importTableRows(
  tableName: MigrationTableName,
  lines: ReadonlyArray<string>,
  mode: MigrationImportMode
): Promise<MigrationImportTableResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (line.length === 0) {
      continue;
    }
    try {
      const raw = JSON.parse(line) as Record<string, unknown>;
      const row = _deserializeRow(raw);
      const outcome = await _upsertRow(tableName, row, mode);
      if (outcome === "inserted") {
        inserted += 1;
      } else if (outcome === "updated") {
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "unknown";
      if (errors.length < 20) {
        errors.push(`Строка ${String(index + 1)}: ${message}`);
      }
    }
  }

  return {
    name: tableName,
    read: lines.filter((line) => line.trim().length > 0).length,
    inserted,
    updated,
    skipped,
    failed,
    errors,
  };
}

type UpsertOutcome = "inserted" | "updated" | "skipped";

async function _upsertRow(
  tableName: MigrationTableName,
  row: Record<string, unknown>,
  mode: MigrationImportMode
): Promise<UpsertOutcome> {
  switch (tableName) {
    case "candidate_folder_record":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.candidateFolderRecord.findUnique({
            where: { folderKey: String(row.folderKey) },
            select: { folderKey: true },
          }),
        create: () => prisma.candidateFolderRecord.create({ data: row as never }),
        update: () =>
          prisma.candidateFolderRecord.update({
            where: { folderKey: String(row.folderKey) },
            data: _omitKeys(row, ["folderKey"]) as never,
          }),
      });
    case "folder_archive_mark":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.folderArchiveMark.findUnique({
            where: { folderKey: String(row.folderKey) },
            select: { folderKey: true },
          }),
        create: () => prisma.folderArchiveMark.create({ data: row as never }),
        update: () =>
          prisma.folderArchiveMark.update({
            where: { folderKey: String(row.folderKey) },
            data: _omitKeys(row, ["folderKey"]) as never,
          }),
      });
    case "interview_folder":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.interviewFolder.findUnique({
            where: { key: String(row.key) },
            select: { id: true },
          }),
        create: () => prisma.interviewFolder.create({ data: row as never }),
        update: () =>
          prisma.interviewFolder.update({
            where: { key: String(row.key) },
            data: _omitKeys(row, ["id", "key"]) as never,
          }),
      });
    case "access_invite":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.accessInvite.findUnique({
            where: { code: String(row.code) },
            select: { id: true },
          }),
        create: () => prisma.accessInvite.create({ data: row as never }),
        update: () =>
          prisma.accessInvite.update({
            where: { code: String(row.code) },
            data: _omitKeys(row, ["id", "code"]) as never,
          }),
      });
    case "admin_app_settings":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.adminAppSettings.findUnique({
            where: { id: String(row.id) },
            select: { id: true },
          }),
        create: () => prisma.adminAppSettings.create({ data: row as never }),
        update: () =>
          prisma.adminAppSettings.update({
            where: { id: String(row.id) },
            data: _omitKeys(row, ["id"]) as never,
          }),
      });
    case "commission_question":
      return _upsertById(mode, "commissionQuestion", row);
    case "interview_commission_member":
      return _upsertCommissionMember(row, mode);
    case "screening_submission":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.screeningSubmission.findUnique({
            where: { sessionId: String(row.sessionId) },
            select: { id: true },
          }),
        create: () => prisma.screeningSubmission.create({ data: row as never }),
        update: () =>
          prisma.screeningSubmission.update({
            where: { sessionId: String(row.sessionId) },
            data: _omitKeys(row, ["id", "sessionId"]) as never,
          }),
      });
    case "audit_submission":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.auditSubmission.findUnique({
            where: { sessionId: String(row.sessionId) },
            select: { id: true },
          }),
        create: () => prisma.auditSubmission.create({ data: row as never }),
        update: () =>
          prisma.auditSubmission.update({
            where: { sessionId: String(row.sessionId) },
            data: _omitKeys(row, ["id", "sessionId"]) as never,
          }),
      });
    case "burnout_submission":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.burnoutSubmission.findUnique({
            where: { sessionId: String(row.sessionId) },
            select: { id: true },
          }),
        create: () => prisma.burnoutSubmission.create({ data: row as never }),
        update: () =>
          prisma.burnoutSubmission.update({
            where: { sessionId: String(row.sessionId) },
            data: _omitKeys(row, ["id", "sessionId"]) as never,
          }),
      });
    case "prof_sb_education_submission":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.profSbEducationSubmission.findUnique({
            where: { sessionId: String(row.sessionId) },
            select: { id: true },
          }),
        create: () => prisma.profSbEducationSubmission.create({ data: row as never }),
        update: () =>
          prisma.profSbEducationSubmission.update({
            where: { sessionId: String(row.sessionId) },
            data: _omitKeys(row, ["id", "sessionId"]) as never,
          }),
      });
    case "burnout_reminder_schedule":
      return _upsertById(mode, "burnoutReminderSchedule", row);
    case "employee_folder_file":
      return _upsertById(mode, "employeeFolderFile", row);
    case "commission_member_question_set":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.commissionMemberQuestionSet.findUnique({
            where: { memberId: String(row.memberId) },
            select: { id: true },
          }),
        create: () => prisma.commissionMemberQuestionSet.create({ data: row as never }),
        update: () =>
          prisma.commissionMemberQuestionSet.update({
            where: { memberId: String(row.memberId) },
            data: _omitKeys(row, ["id", "memberId"]) as never,
          }),
      });
    case "commission_eval_sheet":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.commissionEvalSheet.findUnique({
            where: { accessToken: String(row.accessToken) },
            select: { id: true },
          }),
        create: () => prisma.commissionEvalSheet.create({ data: row as never }),
        update: () =>
          prisma.commissionEvalSheet.update({
            where: { accessToken: String(row.accessToken) },
            data: _omitKeys(row, ["id", "accessToken"]) as never,
          }),
      });
    case "commission_candidate_conclusion":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.commissionCandidateConclusion.findUnique({
            where: { candidateFolderKey: String(row.candidateFolderKey) },
            select: { id: true },
          }),
        create: () => prisma.commissionCandidateConclusion.create({ data: row as never }),
        update: () =>
          prisma.commissionCandidateConclusion.update({
            where: { candidateFolderKey: String(row.candidateFolderKey) },
            data: _omitKeys(row, ["id", "candidateFolderKey"]) as never,
          }),
      });
    case "commission_eval_save_failure_log":
      return _upsertById(mode, "commissionEvalSaveFailureLog", row);
    case "proctor_session":
      return _upsertProctorSession(row, mode);
    case "proctor_session_audio":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.proctorSessionAudio.findUnique({
            where: { proctorSessionId: String(row.proctorSessionId) },
            select: { id: true },
          }),
        create: () => prisma.proctorSessionAudio.create({ data: row as never }),
        update: () =>
          prisma.proctorSessionAudio.update({
            where: { proctorSessionId: String(row.proctorSessionId) },
            data: _omitKeys(row, ["id", "proctorSessionId"]) as never,
          }),
      });
    case "proctor_event":
      return _upsertById(mode, "proctorEvent", row);
    case "proctor_audio_clip":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.proctorAudioClip.findUnique({
            where: { eventId: String(row.eventId) },
            select: { id: true },
          }),
        create: () => prisma.proctorAudioClip.create({ data: row as never }),
        update: () =>
          prisma.proctorAudioClip.update({
            where: { eventId: String(row.eventId) },
            data: _omitKeys(row, ["id", "eventId"]) as never,
          }),
      });
    case "proctor_snapshot":
      return _upsertByUnique({
        mode,
        exists: () =>
          prisma.proctorSnapshot.findUnique({
            where: { eventId: String(row.eventId) },
            select: { id: true },
          }),
        create: () => prisma.proctorSnapshot.create({ data: row as never }),
        update: () =>
          prisma.proctorSnapshot.update({
            where: { eventId: String(row.eventId) },
            data: _omitKeys(row, ["id", "eventId"]) as never,
          }),
      });
    default: {
      const _exhaustive: never = tableName;
      return _exhaustive;
    }
  }
}

/**
 * Участник комиссии: уникальность по папке+email, id сохраняем для FK анкет.
 */
async function _upsertCommissionMember(
  row: Record<string, unknown>,
  mode: MigrationImportMode
): Promise<UpsertOutcome> {
  const interviewFolderKey = String(row.interviewFolderKey);
  const email = String(row.email);
  const existing = await prisma.interviewCommissionMember.findUnique({
    where: {
      interviewFolderKey_email: { interviewFolderKey, email },
    },
    select: { id: true },
  });
  if (existing) {
    if (mode === "skip") {
      return "skipped";
    }
    if (existing.id !== String(row.id)) {
      await prisma.interviewCommissionMember.delete({ where: { id: existing.id } });
      await prisma.interviewCommissionMember.create({ data: row as never });
      return "updated";
    }
    await prisma.interviewCommissionMember.update({
      where: { id: existing.id },
      data: _omitKeys(row, ["id"]) as never,
    });
    return "updated";
  }
  await prisma.interviewCommissionMember.create({ data: row as never });
  return "inserted";
}

/**
 * Сессия прокторинга: при расхождении id пересоздаём, чтобы дети из архива совпали.
 */
async function _upsertProctorSession(
  row: Record<string, unknown>,
  mode: MigrationImportMode
): Promise<UpsertOutcome> {
  const sessionId = String(row.sessionId);
  const existing = await prisma.proctorSession.findUnique({
    where: { sessionId },
    select: { id: true },
  });
  if (existing) {
    if (mode === "skip") {
      return "skipped";
    }
    if (existing.id !== String(row.id)) {
      await prisma.proctorSession.delete({ where: { id: existing.id } });
      await prisma.proctorSession.create({ data: row as never });
      return "updated";
    }
    await prisma.proctorSession.update({
      where: { sessionId },
      data: _omitKeys(row, ["id", "sessionId"]) as never,
    });
    return "updated";
  }
  await prisma.proctorSession.create({ data: row as never });
  return "inserted";
}

async function _upsertById(
  mode: MigrationImportMode,
  model:
    | "commissionQuestion"
    | "burnoutReminderSchedule"
    | "employeeFolderFile"
    | "commissionEvalSaveFailureLog"
    | "proctorEvent",
  row: Record<string, unknown>
): Promise<UpsertOutcome> {
  const id = String(row.id);
  return _upsertByUnique({
    mode,
    exists: async () => {
      const delegate = prisma[model] as {
        findUnique: (args: {
          where: { id: string };
          select: { id: true };
        }) => Promise<{ id: string } | null>;
      };
      return delegate.findUnique({ where: { id }, select: { id: true } });
    },
    create: async () => {
      const delegate = prisma[model] as {
        create: (args: { data: never }) => Promise<unknown>;
      };
      return delegate.create({ data: row as never });
    },
    update: async () => {
      const delegate = prisma[model] as {
        update: (args: { where: { id: string }; data: never }) => Promise<unknown>;
      };
      return delegate.update({
        where: { id },
        data: _omitKeys(row, ["id"]) as never,
      });
    },
  });
}

async function _upsertByUnique(input: {
  mode: MigrationImportMode;
  exists: () => Promise<unknown | null>;
  create: () => Promise<unknown>;
  update: () => Promise<unknown>;
}): Promise<UpsertOutcome> {
  const existing = await input.exists();
  if (existing) {
    if (input.mode === "skip") {
      return "skipped";
    }
    await input.update();
    return "updated";
  }
  await input.create();
  return "inserted";
}

/**
 * Восстанавливает Date и Bytes из сериализованного JSON.
 */
function _deserializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = _deserializeValue(value);
  }
  return out;
}

function _deserializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => _deserializeValue(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.$date === "string") {
      return new Date(record.$date);
    }
    if (typeof record.$bytes === "string") {
      return Buffer.from(record.$bytes, "base64");
    }
    return value;
  }
  return value;
}

function _omitKeys(
  row: Record<string, unknown>,
  keys: ReadonlyArray<string>
): Record<string, unknown> {
  const skip = new Set(keys);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!skip.has(key)) {
      out[key] = value;
    }
  }
  return out;
}
