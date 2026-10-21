const APP_TIME_ZONE = "Europe/Moscow";

const MONTHS_GENITIVE: ReadonlyArray<string> = [
  "янв.",
  "февр.",
  "мар.",
  "апр.",
  "мая",
  "июн.",
  "июл.",
  "авг.",
  "сент.",
  "окт.",
  "нояб.",
  "дек.",
];

type MoscowParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function parseMoscowParts(input: Date | string | number): MoscowParts | null {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

/**
 * Краткая дата-время для админки: «19 окт., 15:48» (МСК), без секунд.
 */
export function formatAdminDateTimeShort(
  input: Date | string | number,
  referenceNow: Date = new Date()
): string {
  const parts = parseMoscowParts(input);
  if (!parts) {
    return "—";
  }
  const ref = parseMoscowParts(referenceNow);
  const monthLabel = MONTHS_GENITIVE[parts.month - 1] ?? "";
  const dayMonth =
    ref && ref.year === parts.year
      ? `${String(parts.day)} ${monthLabel}`
      : `${String(parts.day)} ${monthLabel} ${String(parts.year)}`;
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  return `${dayMonth}, ${hh}:${mm}`;
}

/**
 * Полная подпись для title/tooltip.
 */
export function formatAdminDateTimeTitle(input: Date | string | number): string {
  const parts = parseMoscowParts(input);
  if (!parts) {
    return "";
  }
  const monthLabel = MONTHS_GENITIVE[parts.month - 1] ?? "";
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  return `${String(parts.day)} ${monthLabel} ${String(parts.year)}, ${hh}:${mm} МСК`;
}

/**
 * Дата для строки активности: «19 окт.» или с годом.
 */
export function formatAdminDateShort(
  input: Date | string | number,
  referenceNow: Date = new Date()
): string {
  const parts = parseMoscowParts(input);
  if (!parts) {
    return "—";
  }
  const ref = parseMoscowParts(referenceNow);
  const monthLabel = MONTHS_GENITIVE[parts.month - 1] ?? "";
  if (ref && ref.year === parts.year) {
    return `${String(parts.day)} ${monthLabel}`;
  }
  return `${String(parts.day)} ${monthLabel} ${String(parts.year)}`;
}

/**
 * Календарная дата YYYY-MM-DD → «04.03.1992».
 */
export function formatBirthDateRu(isoDate: string | null | undefined): string | null {
  if (!isoDate?.trim()) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) {
    return isoDate.trim();
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}
