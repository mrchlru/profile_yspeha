/**
 * Формат миграционного архива Railway → Timeweb.
 * ZIP: manifest.json + tables/<name>.ndjson (даты/байты в JSON-обёртках).
 */

export const MIGRATION_ARCHIVE_VERSION = 1 as const;

export const MIGRATION_ARCHIVE_MANIFEST_FILE = "manifest.json";

/** Таблицы в порядке импорта (сначала родители, потом FK). Без HrdAccount. */
export const MIGRATION_TABLE_ORDER = [
  "candidate_folder_record",
  "folder_archive_mark",
  "interview_folder",
  "access_invite",
  "admin_app_settings",
  "commission_question",
  "interview_commission_member",
  "screening_submission",
  "audit_submission",
  "burnout_submission",
  "prof_sb_education_submission",
  "burnout_reminder_schedule",
  "employee_folder_file",
  "commission_member_question_set",
  "commission_eval_sheet",
  "commission_candidate_conclusion",
  "commission_eval_save_failure_log",
  "proctor_session",
  "proctor_session_audio",
  "proctor_event",
  "proctor_audio_clip",
  "proctor_snapshot",
] as const;

export type MigrationTableName = (typeof MIGRATION_TABLE_ORDER)[number];

export type MigrationArchiveManifest = {
  version: typeof MIGRATION_ARCHIVE_VERSION;
  exportedAt: string;
  source: string;
  tables: ReadonlyArray<{
    name: MigrationTableName;
    rowCount: number;
  }>;
};

export type MigrationImportMode = "skip" | "overwrite";

export type MigrationImportTableResult = {
  name: MigrationTableName;
  read: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ReadonlyArray<string>;
};

export type MigrationImportResult = {
  version: number;
  mode: MigrationImportMode;
  tables: ReadonlyArray<MigrationImportTableResult>;
};
