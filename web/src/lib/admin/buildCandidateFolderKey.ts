/**
 * Канонический ключ папки соискателя для архива и оценочной комиссии.
 */

import { buildCandidateDisplayName } from "@/lib/admin/candidateSearch";

export type CandidateFolderInput = {
  lastName: string;
  firstName: string;
  middleName?: string | null;
  /** Календарная дата рождения (локальная, без времени). */
  birthDate: Date;
};

export type CandidateFolderIdentity = {
  key: string;
  displayName: string;
  lastNameDisplay: string;
  firstNameDisplay: string;
  middleNameDisplay: string | null;
  birthDateIso: string;
};

const CANDIDATE_FOLDER_KEY_PREFIX = "candidate";

/**
 * Форматирует дату рождения для отображения в названии папки.
 */
export function formatCandidateBirthDateRu(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Строит ключ и отображаемое имя папки из ФИО и даты рождения.
 */
export function buildCandidateFolderKey(
  input: CandidateFolderInput
): CandidateFolderIdentity | null {
  const lastNameDisplay = _normalizeDisplay(input.lastName);
  const firstNameDisplay = _normalizeDisplay(input.firstName);
  const middleNameDisplay = input.middleName?.trim()
    ? _normalizeDisplay(input.middleName)
    : null;
  if (lastNameDisplay.length === 0 || firstNameDisplay.length === 0) {
    return null;
  }

  const birthDateIso = _toIsoDate(input.birthDate);
  if (!birthDateIso) {
    return null;
  }

  const key = [
    CANDIDATE_FOLDER_KEY_PREFIX,
    _canonicalize(lastNameDisplay),
    _canonicalize(firstNameDisplay),
    birthDateIso,
  ].join(":");

  return {
    key,
    displayName: buildCandidateDisplayName({
      lastName: lastNameDisplay,
      firstName: firstNameDisplay,
      middleName: middleNameDisplay,
      birthDate: input.birthDate,
    }),
    lastNameDisplay,
    firstNameDisplay,
    middleNameDisplay,
    birthDateIso,
  };
}

/**
 * Парсит дату рождения из строки `YYYY-MM-DD`.
 */
export function parseCandidateBirthDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const date = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || _toIsoDate(date) !== trimmed) {
    return null;
  }
  return date;
}

function _toIsoDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function _normalizeDisplay(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) {
    return "";
  }
  return collapsed
    .split(/[\s-]/)
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase()))
    .join(" ");
}

function _canonicalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}
