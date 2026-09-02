import {
  buildCandidateFolderKey,
  parseCandidateBirthDate,
  type CandidateFolderIdentity,
} from "@/lib/admin/buildCandidateFolderKey";
import {
  ARCHIVE_REASON_DISMISSED,
  ARCHIVE_REASON_INTERVIEW_NOT_HIRED,
  CANDIDATE_LIFECYCLE_ACTIVE,
  CANDIDATE_LIFECYCLE_ARCHIVED,
  CANDIDATE_LIFECYCLE_INTERVIEW,
  type CandidateArchiveReason,
  type CandidateFolderRecordSummary,
  type CandidateLifecycleStatus,
  type CandidateLookupMatch,
  type CandidateLookupReason,
} from "@/lib/admin/candidateFolderTypes";
import { buildCandidateDisplayName } from "@/lib/admin/candidateSearch";
import { prisma } from "@/lib/prisma";

export type EnsureCandidateFolderInput = {
  folderKey: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  birthDate: Date;
};

/**
 * Создаёт или возвращает запись папки кандидата со статусом «собеседование».
 */
export async function ensureCandidateFolderRecord(
  input: EnsureCandidateFolderInput,
  options?: { reopenInterview?: boolean }
): Promise<CandidateFolderRecordSummary> {
  const existing = await prisma.candidateFolderRecord.findUnique({
    where: { folderKey: input.folderKey },
  });
  if (existing) {
    if (
      options?.reopenInterview &&
      existing.lifecycleStatus === CANDIDATE_LIFECYCLE_ARCHIVED
    ) {
      const row = await prisma.candidateFolderRecord.update({
        where: { folderKey: input.folderKey },
        data: {
          lifecycleStatus: CANDIDATE_LIFECYCLE_INTERVIEW,
          archivedAt: null,
          archiveReason: null,
        },
      });
      return _toSummary(row);
    }
    return _toSummary(existing);
  }

  const row = await prisma.candidateFolderRecord.create({
    data: {
      folderKey: input.folderKey,
      lifecycleStatus: CANDIDATE_LIFECYCLE_INTERVIEW,
      lastName: input.lastName,
      firstName: input.firstName,
      middleName: input.middleName?.trim() || null,
      birthDate: input.birthDate,
    },
  });
  return _toSummary(row);
}

/**
 * Возвращает статус папки кандидата; для audit-папок — null.
 */
export async function getCandidateFolderRecord(
  folderKey: string
): Promise<CandidateFolderRecordSummary | null> {
  if (!folderKey.startsWith("candidate:")) {
    return null;
  }
  const row = await prisma.candidateFolderRecord.findUnique({
    where: { folderKey },
  });
  return row ? _toSummary(row) : null;
}

/**
 * Загружает карту статусов для списка папок кандидатов.
 */
export async function loadCandidateFolderStatusMap(
  folderKeys: ReadonlyArray<string>
): Promise<Map<string, CandidateFolderRecordSummary>> {
  const candidateKeys = folderKeys.filter((key) => key.startsWith("candidate:"));
  if (candidateKeys.length === 0) {
    return new Map();
  }
  const rows = await prisma.candidateFolderRecord.findMany({
    where: { folderKey: { in: [...candidateKeys] } },
  });
  return new Map(rows.map((row) => [row.folderKey, _toSummary(row)]));
}

export type CandidateLifecycleAction = "hire" | "archive" | "restore";

/**
 * Меняет жизненный цикл папки кандидата.
 */
export async function applyCandidateFolderLifecycle(
  folderKey: string,
  action: CandidateLifecycleAction
): Promise<CandidateFolderRecordSummary> {
  if (!folderKey.startsWith("candidate:")) {
    throw new Error("Действие доступно только для папок кандидатов");
  }

  const existing = await prisma.candidateFolderRecord.findUnique({
    where: { folderKey },
  });
  if (!existing) {
    throw new Error("Папка кандидата не найдена");
  }

  const now = new Date();

  if (action === "hire") {
    const row = await prisma.candidateFolderRecord.update({
      where: { folderKey },
      data: {
        lifecycleStatus: CANDIDATE_LIFECYCLE_ACTIVE,
        activatedAt: existing.activatedAt ?? now,
        archivedAt: null,
        archiveReason: null,
      },
    });
    return _toSummary(row);
  }

  if (action === "archive") {
    const reason: CandidateArchiveReason =
      existing.lifecycleStatus === CANDIDATE_LIFECYCLE_ACTIVE
        ? ARCHIVE_REASON_DISMISSED
        : ARCHIVE_REASON_INTERVIEW_NOT_HIRED;
    const row = await prisma.candidateFolderRecord.update({
      where: { folderKey },
      data: {
        lifecycleStatus: CANDIDATE_LIFECYCLE_ARCHIVED,
        archivedAt: now,
        archiveReason: reason,
      },
    });
    return _toSummary(row);
  }

  const row = await prisma.candidateFolderRecord.update({
    where: { folderKey },
    data: {
      lifecycleStatus: CANDIDATE_LIFECYCLE_ACTIVE,
      activatedAt: existing.activatedAt ?? now,
      archivedAt: null,
      archiveReason: null,
    },
  });
  return _toSummary(row);
}

/**
 * Ищет точное совпадение кандидата по ФИО и дате рождения.
 */
export async function lookupCandidateByIdentity(input: {
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
}): Promise<CandidateLookupMatch | null> {
  const birthDate = parseCandidateBirthDate(input.birthDate);
  if (!birthDate) {
    return null;
  }

  const identity = buildCandidateFolderKey({
    lastName: input.lastName,
    firstName: input.firstName,
    middleName: input.middleName,
    birthDate,
  });
  if (!identity) {
    return null;
  }

  const record = await prisma.candidateFolderRecord.findUnique({
    where: { folderKey: identity.key },
  });
  if (!record) {
    return null;
  }

  const summary = _toSummary(record);
  const reason = _lookupReason(summary.lifecycleStatus, summary.archiveReason);
  return {
    folderKey: summary.folderKey,
    displayName: summary.displayName,
    lifecycleStatus: summary.lifecycleStatus,
    reason,
    reasonLabel: _lookupReasonLabel(reason),
    willReuseFolder: true,
  };
}

/**
 * Проверяет, должна ли папка отображаться в разделе «Результаты».
 */
export function folderVisibleInResults(
  folderKey: string,
  lifecycleStatus: CandidateLifecycleStatus | null,
  isArchiveMarked: boolean,
  archiveView: boolean
): boolean {
  if (folderKey.startsWith("candidate:")) {
    return candidateFolderVisibleInResults(folderKey, lifecycleStatus, archiveView);
  }
  if (archiveView) {
    return isArchiveMarked;
  }
  return !isArchiveMarked;
}

/**
 * Проверяет, должна ли папка кандидата отображаться в разделе «Результаты».
 */
export function candidateFolderVisibleInResults(
  folderKey: string,
  lifecycleStatus: CandidateLifecycleStatus | null,
  archiveView: boolean
): boolean {
  if (!folderKey.startsWith("candidate:")) {
    return !archiveView;
  }
  if (!lifecycleStatus) {
    return archiveView;
  }
  if (archiveView) {
    return lifecycleStatus === CANDIDATE_LIFECYCLE_ARCHIVED;
  }
  return lifecycleStatus === CANDIDATE_LIFECYCLE_ACTIVE;
}

function _lookupReason(
  status: CandidateLifecycleStatus,
  archiveReason: CandidateArchiveReason | null
): CandidateLookupReason {
  if (status === CANDIDATE_LIFECYCLE_ACTIVE) {
    return "currently_employed";
  }
  if (status === CANDIDATE_LIFECYCLE_INTERVIEW) {
    return "in_interview";
  }
  if (archiveReason === ARCHIVE_REASON_DISMISSED) {
    return "previously_dismissed";
  }
  return "interview_archived";
}

function _lookupReasonLabel(reason: CandidateLookupReason): string {
  switch (reason) {
    case "currently_employed":
      return "Сотрудник трудоустроен на данный момент (папка в «Результаты тестирования»).";
    case "previously_dismissed":
      return "Сотрудник был трудоустроен ранее и уволен (папка в архиве результатов).";
    case "interview_archived":
      return "Кандидат проходил собеседование ранее и не был принят (папка в архиве).";
    case "in_interview":
      return "Кандидат уже в процессе собеседования по другой вакансии.";
  }
}

function _toSummary(row: {
  folderKey: string;
  lifecycleStatus: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  birthDate: Date;
  activatedAt: Date | null;
  archivedAt: Date | null;
  archiveReason: string | null;
}): CandidateFolderRecordSummary {
  return {
    folderKey: row.folderKey,
    displayName: buildCandidateDisplayName({
      lastName: row.lastName,
      firstName: row.firstName,
      middleName: row.middleName,
      birthDate: row.birthDate,
    }),
    lifecycleStatus: row.lifecycleStatus as CandidateLifecycleStatus,
    archiveReason: row.archiveReason as CandidateArchiveReason | null,
    lastName: row.lastName,
    firstName: row.firstName,
    middleName: row.middleName,
    birthDate: row.birthDate.toISOString().slice(0, 10),
    activatedAt: row.activatedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

/**
 * Строит identity и гарантирует запись папки из данных формы.
 */
export async function ensureCandidateFolderFromForm(input: {
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
}): Promise<CandidateFolderIdentity | { error: string }> {
  const birthDate = parseCandidateBirthDate(input.birthDate);
  if (!birthDate) {
    return { error: "Укажите корректную дату рождения" };
  }
  const identity = buildCandidateFolderKey({
    lastName: input.lastName,
    firstName: input.firstName,
    middleName: input.middleName,
    birthDate,
  });
  if (!identity) {
    return { error: "Проверьте фамилию и имя сотрудника" };
  }
  await ensureCandidateFolderRecord({
    folderKey: identity.key,
    lastName: identity.lastNameDisplay,
    firstName: identity.firstNameDisplay,
    middleName: identity.middleNameDisplay,
    birthDate,
  });
  return identity;
}
