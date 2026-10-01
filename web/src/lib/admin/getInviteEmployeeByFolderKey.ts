import {
  buildCandidateDisplayName,
  matchesCandidateSearch,
} from "@/lib/admin/candidateSearch";
import { candidatePositionLevelLabel } from "@/lib/admin/candidatePositionLevels";
import { listEmployeeFolders } from "@/lib/admin/buildEmployeeFolders";
import type { InviteCandidateData } from "@/lib/admin/parseScreeningInviteCandidate";
import { parseCandidateBirthDate } from "@/lib/admin/buildCandidateFolderKey";
import { isCandidatePositionLevel } from "@/lib/admin/candidatePositionLevels";

export type InviteEmployeeOption = {
  folderKey: string;
  displayName: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  birthDate: string;
  positionLevel: string | null;
  positionLevelLabel: string | null;
  hasScreening: boolean;
};

/**
 * Список сотрудников с любым прохождением теста для выбора при создании приглашения.
 */
export async function listInviteEmployeeOptions(
  query?: string
): Promise<InviteEmployeeOption[]> {
  const folders = await listEmployeeFolders(query, "all");

  return folders
    .filter(
      (folder) =>
        _folderHasAnyTestSession(folder) &&
        folder.key.startsWith("candidate:") &&
        folder.lastName &&
        folder.firstName &&
        folder.birthDate
    )
    .map((folder) => ({
      folderKey: folder.key,
      displayName: folder.displayName,
      lastName: folder.lastName ?? "",
      firstName: folder.firstName ?? "",
      middleName: folder.middleName,
      birthDate: folder.birthDate ?? "",
      positionLevel: folder.positionLevel,
      positionLevelLabel: folder.positionLevelLabel,
      hasScreening: folder.hasScreening,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"));
}

/**
 * Восстанавливает данные сотрудника по ключу папки из архива.
 */
export async function getInviteEmployeeByFolderKey(
  folderKey: string,
  positionLevelOverride?: string
): Promise<InviteCandidateData | { error: string }> {
  const options = await listInviteEmployeeOptions();
  const employee = options.find((item) => item.folderKey === folderKey);
  if (!employee) {
    return { error: "Сотрудник не найден или ещё не проходил тестирование" };
  }

  const birthDate = parseCandidateBirthDate(employee.birthDate);
  if (!birthDate) {
    return { error: "У сотрудника некорректная дата рождения в архиве" };
  }

  const positionLevel = positionLevelOverride?.trim() || employee.positionLevel;
  if (!positionLevel || !isCandidatePositionLevel(positionLevel)) {
    return { error: "Укажите уровень должности сотрудника" };
  }

  return {
    lastName: employee.lastName,
    firstName: employee.firstName,
    middleName: employee.middleName,
    birthDate,
    positionLevel,
    folderKey: employee.folderKey,
    folderDisplayName: buildCandidateDisplayName({
      lastName: employee.lastName,
      firstName: employee.firstName,
      middleName: employee.middleName,
      birthDate,
    }),
    interviewFolderKey: null,
    interviewFolderDisplayName: null,
  };
}

/**
 * Фильтрует опции сотрудников по поисковому запросу (клиентский fallback).
 */
export function filterInviteEmployeeOptions(
  items: ReadonlyArray<InviteEmployeeOption>,
  query: string
): InviteEmployeeOption[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...items];
  }

  return items.filter((item) =>
    matchesCandidateSearch(trimmed, {
      lastName: item.lastName,
      firstName: item.firstName,
      middleName: item.middleName,
      birthDate: parseCandidateBirthDate(item.birthDate),
      positionLevel: item.positionLevel,
      positionLevelLabel: item.positionLevel
        ? candidatePositionLevelLabel(item.positionLevel)
        : null,
      displayName: item.displayName,
    })
  );
}

/**
 * Есть ли у папки хотя бы одно сохранённое прохождение любого теста.
 */
function _folderHasAnyTestSession(folder: {
  screeningSessions: number;
  auditSessions: number;
  profSbEducationSessionCount: number;
  burnoutSessionCount: number;
  specialistScreeningSessionCount: number;
  attestationSessionCount: number;
}): boolean {
  return (
    folder.screeningSessions > 0 ||
    folder.auditSessions > 0 ||
    folder.profSbEducationSessionCount > 0 ||
    folder.burnoutSessionCount > 0 ||
    folder.specialistScreeningSessionCount > 0 ||
    folder.attestationSessionCount > 0
  );
}
