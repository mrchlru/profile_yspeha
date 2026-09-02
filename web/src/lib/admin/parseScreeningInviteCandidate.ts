import { z } from "zod";

import {
  buildCandidateFolderKey,
  parseCandidateBirthDate,
} from "@/lib/admin/buildCandidateFolderKey";
import { isCandidatePositionLevel } from "@/lib/admin/candidatePositionLevels";
import { getInviteEmployeeByFolderKey } from "@/lib/admin/getInviteEmployeeByFolderKey";
import {
  createInterviewFolderForPosition,
  getInterviewFolderByKey,
} from "@/lib/admin/interviewFolders";
import { ensureCandidateFolderRecord } from "@/lib/admin/candidateFolderLifecycle";
import {
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_BURNOUT,
  TEST_KIND_PROF_SB_EDUCATION,
  TEST_KIND_SCREENING,
  TEST_KIND_STATE_AUDIT,
  TEST_KIND_STATE_AUDIT_DEV,
  testKindRequiresInviteCandidate,
  type TestKind,
} from "@/lib/access/testKinds";

const inviteCandidateFormSchema = z
  .object({
    lastName: z.string().trim().min(1).max(120),
    firstName: z.string().trim().min(1).max(120),
    middleName: z.string().trim().max(120).optional(),
    birthDate: z.string().trim().min(10).max(10),
    positionLevel: z.string().trim().min(1).max(80),
    /** Название должности (вакансии) для новой папки в разделе «Собеседование». */
    positionTitle: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export const accessInviteBodySchema = z
  .object({
    testKind: z.enum([
      TEST_KIND_SCREENING,
      TEST_KIND_STATE_AUDIT,
      TEST_KIND_STATE_AUDIT_DEV,
      TEST_KIND_AUDIT_SENIOR,
      TEST_KIND_AUDIT_MIDDLE,
      TEST_KIND_BURNOUT,
      TEST_KIND_PROF_SB_EDUCATION,
    ]),
    candidate: inviteCandidateFormSchema.optional(),
    existingFolderKey: z.string().trim().min(1).max(300).optional(),
    /** Папка вакансии из раздела «Собеседование» (для скрининга). */
    existingInterviewFolderKey: z.string().trim().min(1).max(300).optional(),
    positionLevelOverride: z.string().trim().min(1).max(80).optional(),
    /** Техническое приглашение (только главный администратор). */
    devMode: z.boolean().optional(),
  })
  .strict();

export type AccessInviteBody = z.infer<typeof accessInviteBodySchema>;

export type InviteCandidateData = {
  lastName: string;
  firstName: string;
  middleName: string | null;
  birthDate: Date;
  positionLevel: string;
  folderKey: string;
  folderDisplayName: string;
  interviewFolderKey: string | null;
  interviewFolderDisplayName: string | null;
};

/** @deprecated Используйте InviteCandidateData. */
export type ScreeningInviteCandidateData = InviteCandidateData;

/**
 * Валидирует и нормализует данные сотрудника для приглашения.
 */
export async function parseInviteCandidate(
  body: AccessInviteBody
): Promise<InviteCandidateData | { error: string } | null> {
  if (!testKindRequiresInviteCandidate(body.testKind)) {
    return null;
  }

  if (body.testKind === TEST_KIND_SCREENING) {
    if (!body.candidate) {
      return { error: "Укажите фамилию, имя, дату рождения и уровень должности" };
    }
    return _parseScreeningCandidate(body);
  }

  if (body.existingFolderKey) {
    return getInviteEmployeeByFolderKey(
      body.existingFolderKey,
      body.positionLevelOverride ?? body.candidate?.positionLevel
    );
  }

  if (body.candidate) {
    return _parseCandidateForm(body.candidate);
  }

  return { error: "Выберите сотрудника из списка или заполните данные нового" };
}

/**
 * Валидирует данные соискателя для приглашения на скрининг.
 */
export function parseScreeningInviteCandidate(
  body: AccessInviteBody
): InviteCandidateData | { error: string } {
  if (body.testKind !== TEST_KIND_SCREENING) {
    return { error: "Некорректные данные" };
  }

  if (!body.candidate) {
    return { error: "Укажите фамилию, имя, дату рождения и уровень должности" };
  }

  const parsed = _parseCandidateForm(body.candidate);
  if ("error" in parsed) {
    return parsed;
  }
  return parsed;
}

async function _parseScreeningCandidate(
  body: AccessInviteBody
): Promise<InviteCandidateData | { error: string }> {
  if (!body.candidate) {
    return { error: "Укажите данные соискателя" };
  }

  const parsed = _parseCandidateForm(body.candidate);
  if ("error" in parsed) {
    return parsed;
  }

  let interviewFolder: { key: string; displayName: string } | null = null;

  if (body.existingInterviewFolderKey) {
    const existing = await getInterviewFolderByKey(body.existingInterviewFolderKey);
    if (!existing) {
      return { error: "Папка собеседования не найдена" };
    }
    interviewFolder = { key: existing.key, displayName: existing.displayName };
  } else {
    const positionTitle = body.candidate.positionTitle?.trim() ?? "";
    if (!positionTitle) {
      return {
        error: "Укажите должность для новой вакансии или выберите папку из раздела «Собеседование»",
      };
    }
    const created = await createInterviewFolderForPosition(positionTitle);
    if ("error" in created) {
      return created;
    }
    interviewFolder = { key: created.key, displayName: created.displayName };
  }

  const result = {
    ...parsed,
    interviewFolderKey: interviewFolder.key,
    interviewFolderDisplayName: interviewFolder.displayName,
  };
  await ensureCandidateFolderRecord(
    {
      folderKey: parsed.folderKey,
      lastName: parsed.lastName,
      firstName: parsed.firstName,
      middleName: parsed.middleName,
      birthDate: parsed.birthDate,
    },
    { reopenInterview: true }
  );
  return result;
}

function _parseCandidateForm(
  candidate: z.infer<typeof inviteCandidateFormSchema>
): InviteCandidateData | { error: string } {
  const birthDate = parseCandidateBirthDate(candidate.birthDate);
  if (!birthDate) {
    return { error: "Укажите корректную дату рождения" };
  }

  if (!isCandidatePositionLevel(candidate.positionLevel)) {
    return { error: "Выберите уровень должности из списка" };
  }

  const folder = buildCandidateFolderKey({
    lastName: candidate.lastName,
    firstName: candidate.firstName,
    middleName: candidate.middleName,
    birthDate,
  });
  if (!folder) {
    return { error: "Проверьте фамилию и имя сотрудника" };
  }

  return {
    lastName: folder.lastNameDisplay,
    firstName: folder.firstNameDisplay,
    middleName: folder.middleNameDisplay,
    birthDate,
    positionLevel: candidate.positionLevel,
    folderKey: folder.key,
    folderDisplayName: folder.displayName,
    interviewFolderKey: null,
    interviewFolderDisplayName: null,
  };
}

/**
 * Возвращает testKind из тела запроса после валидации схемы.
 */
export function accessInviteTestKind(body: AccessInviteBody): TestKind {
  return body.testKind;
}
