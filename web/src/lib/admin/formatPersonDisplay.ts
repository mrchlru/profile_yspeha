import { formatBirthDateRu } from "@/lib/datetime/adminDateFormat";

export type PersonDisplayFields = {
  displayName: string;
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  birthDate?: string | null;
  positionLevelLabel?: string | null;
};

/**
 * ФИО одной строкой (без даты рождения).
 */
export function formatPersonName(fields: PersonDisplayFields): string {
  const fromParts = [fields.lastName, fields.firstName, fields.middleName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  if (fromParts) {
    return fromParts;
  }
  return fields.displayName.trim();
}

/**
 * Серая подстрока «дата · уровень» (G4).
 */
export function formatPersonMetaLine(fields: PersonDisplayFields): string | null {
  const birth = formatBirthDateRu(fields.birthDate);
  const level = fields.positionLevelLabel?.trim();
  const parts = [birth, level].filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" · ");
}
