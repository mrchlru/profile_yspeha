const RU_MONTHS: ReadonlyArray<{ prefixes: ReadonlyArray<string>; month: number }> = [
  { prefixes: ["январ", "янв"], month: 1 },
  { prefixes: ["феврал", "фев"], month: 2 },
  { prefixes: ["март", "мар"], month: 3 },
  { prefixes: ["апрел", "апр"], month: 4 },
  { prefixes: ["май"], month: 5 },
  { prefixes: ["июн"], month: 6 },
  { prefixes: ["июл"], month: 7 },
  { prefixes: ["август", "авг"], month: 8 },
  { prefixes: ["сентябр", "сен"], month: 9 },
  { prefixes: ["октябр", "окт"], month: 10 },
  { prefixes: ["ноябр", "ноя"], month: 11 },
  { prefixes: ["декабр", "дек"], month: 12 },
];

/**
 * Парсит дату из поискового запроса в разных пользовательских форматах.
 */
export function parseFlexibleBirthDateQuery(input: string): Date | null {
  const trimmed = input.trim().toLowerCase().replace(/ё/g, "е");
  if (!trimmed) {
    return null;
  }

  const ymd = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (ymd) {
    return _makeUtcDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  }

  const dmy = trimmed.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dmy) {
    return _makeUtcDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  }

  const dMonthY = trimmed.match(/^(\d{1,2})\s+([а-яa-z]+)\s+(\d{4})$/);
  if (dMonthY) {
    const month = _resolveRuMonth(dMonthY[2]);
    if (month) {
      return _makeUtcDate(Number(dMonthY[3]), month, Number(dMonthY[1]));
    }
  }

  const monthYD = trimmed.match(/^([а-яa-z]+)\s+(\d{4})$/);
  if (monthYD) {
    const month = _resolveRuMonth(monthYD[1]);
    if (month) {
      return _makeUtcDate(Number(monthYD[2]), month, 1);
    }
  }

  return null;
}

/**
 * Сравнивает две календарные даты (UTC, без времени).
 */
export function isSameUtcCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Длинный формат даты для поиска: «12 июля 1978».
 */
export function formatCandidateBirthDateLongRu(date: Date): string {
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()] ?? "";
  const year = date.getUTCFullYear();
  return `${String(day)} ${month} ${year}`;
}

function _makeUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function _resolveRuMonth(token: string): number | null {
  const normalized = token.trim().toLowerCase().replace(/ё/g, "е");
  for (const entry of RU_MONTHS) {
    if (entry.prefixes.some((prefix) => normalized.startsWith(prefix))) {
      return entry.month;
    }
  }
  return null;
}
