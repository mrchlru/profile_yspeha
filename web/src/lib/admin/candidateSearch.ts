import { formatCandidateBirthDateRu } from "@/lib/admin/buildCandidateFolderKey";
import {
  formatCandidateBirthDateLongRu,
  isSameUtcCalendarDate,
  parseFlexibleBirthDateQuery,
} from "@/lib/admin/candidateFlexibleDate";

export type CandidateSearchRecord = {
  code?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  birthDate?: Date | null;
  positionLevel?: string | null;
  positionLevelLabel?: string | null;
  displayName?: string | null;
};

/**
 * Нормализует строку для нечёткого поиска.
 */
export function normalizeCandidateSearchText(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/**
 * Собирает отображаемое ФИО с датой рождения.
 */
export function buildCandidateDisplayName(parts: {
  lastName: string;
  firstName: string;
  middleName?: string | null;
  birthDate?: Date | null;
}): string {
  const fio = [parts.lastName, parts.firstName, parts.middleName?.trim() || ""]
    .filter((part) => part.length > 0)
    .join(" ");
  if (parts.birthDate) {
    return `${fio}, ${formatCandidateBirthDateRu(parts.birthDate)}`;
  }
  return fio;
}

/**
 * Формирует набор поисковых вариантов по полям соискателя.
 */
export function buildCandidateSearchVariants(record: CandidateSearchRecord): ReadonlyArray<string> {
  const variants = new Set<string>();
  const add = (value: string | null | undefined): void => {
    const normalized = normalizeCandidateSearchText(value ?? "");
    if (normalized) {
      variants.add(normalized);
    }
  };

  add(record.code?.replace(/\s/g, ""));
  add(record.lastName);
  add(record.firstName);
  add(record.middleName);
  add(record.displayName);
  add(record.positionLevel);
  add(record.positionLevelLabel);

  const lastName = record.lastName?.trim() ?? "";
  const firstName = record.firstName?.trim() ?? "";
  const middleName = record.middleName?.trim() ?? "";

  if (lastName && firstName) {
    add(`${lastName} ${firstName}`);
    add(`${firstName} ${lastName}`);
    if (middleName) {
      add(`${lastName} ${firstName} ${middleName}`);
      add(`${firstName} ${middleName} ${lastName}`);
      add(`${lastName} ${middleName}`);
      add(`${firstName} ${middleName}`);
      add(middleName);
    }
  }

  if (record.birthDate) {
    const date = record.birthDate;
    add(formatCandidateBirthDateRu(date));
    add(formatCandidateBirthDateLongRu(date));
    add(
      `${String(date.getUTCFullYear())}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`
    );
    add(
      `${String(date.getUTCFullYear())}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
    );
    add(String(date.getUTCFullYear()));
    add(`${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  return [...variants];
}

/**
 * Проверяет, подходит ли запись под поисковый запрос.
 */
export function matchesCandidateSearch(
  query: string,
  record: CandidateSearchRecord
): boolean {
  const normalizedQuery = normalizeCandidateSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const variants = buildCandidateSearchVariants(record);
  const joined = variants.join(" ");

  if (joined.includes(normalizedQuery)) {
    return true;
  }

  const compactCode = record.code?.replace(/\s/g, "").toLowerCase();
  if (compactCode && compactCode.includes(normalizedQuery.replace(/\s/g, ""))) {
    return true;
  }

  const queryDate = parseFlexibleBirthDateQuery(normalizedQuery);
  if (queryDate && record.birthDate && isSameUtcCalendarDate(queryDate, record.birthDate)) {
    return true;
  }

  const tokens = normalizedQuery.split(" ").filter((token) => token.length > 0);
  if (tokens.length > 1) {
    return tokens.every((token) => _tokenMatches(token, record, variants));
  }

  return false;
}

function _tokenMatches(
  token: string,
  record: CandidateSearchRecord,
  variants: ReadonlyArray<string>
): boolean {
  if (variants.some((variant) => variant.includes(token))) {
    return true;
  }

  const tokenDate = parseFlexibleBirthDateQuery(token);
  if (tokenDate && record.birthDate && isSameUtcCalendarDate(tokenDate, record.birthDate)) {
    return true;
  }

  return false;
}
