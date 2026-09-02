import { APP_TIME_ZONE } from "@/lib/datetime/moscowTime";

/**
 * Дата прохождения для имени файла (МСК, DD.MM.YYYY).
 */
export function formatReportExportDateStamp(completedAt: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(completedAt);

  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${read("day")}.${read("month")}.${read("year")}`;
}

function _sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

/**
 * Базовое имя файла: «Фамилия_Имя_дата прохождения» (без расширения).
 */
export function formatReportExportFileStem(
  lastName: string,
  firstName: string,
  completedAt: Date
): string {
  const ln = _sanitizeFileNamePart(lastName) || "Фамилия";
  const fn = _sanitizeFileNamePart(firstName) || "Имя";
  const date = formatReportExportDateStamp(completedAt);
  return `${ln}_${fn}_${date}`;
}

/**
 * Делает имена уникальными в наборе (добавляет _2, _3 …).
 */
export function dedupeReportExportFileNames(fileNames: string[]): string[] {
  const used = new Map<string, number>();
  return fileNames.map((name) => {
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count === 0) {
      return name;
    }
    const dot = name.lastIndexOf(".");
    if (dot <= 0) {
      return `${name}_${String(count + 1)}`;
    }
    return `${name.slice(0, dot)}_${String(count + 1)}${name.slice(dot)}`;
  });
}
