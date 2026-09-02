/** Часовой пояс приложения для отображения даты и времени. */
export const APP_TIME_ZONE = "Europe/Moscow" as const;

/** Подпись часового пояса в интерфейсе. */
export const APP_TIME_ZONE_LABEL = "МСК" as const;

const MSK_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

const MSK_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

function _parseDateInput(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

function _isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

/**
 * Дата и время в часовом поясе МСК (формат ru-RU).
 */
export function formatMoscowDateTime(input: Date | string | number): string {
  const date = _parseDateInput(input);
  if (!_isValidDate(date)) {
    return "—";
  }
  return date.toLocaleString("ru-RU", MSK_DATE_TIME_OPTIONS);
}

/**
 * Компактная метка даты и времени в МСК для таблиц: YYYY-MM-DD HH:mm:ss.
 */
export function formatMoscowDateTimeTable(input: Date | string | number): string {
  const date = _parseDateInput(input);
  if (!_isValidDate(date)) {
    return "—";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    ...MSK_DATE_TIME_OPTIONS,
    timeZone: APP_TIME_ZONE,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${read("year")}-${read("month")}-${read("day")} ${read("hour")}:${read("minute")}:${read("second")}`;
}

/**
 * Только дата в МСК (формат ru-RU).
 */
export function formatMoscowDate(input: Date | string | number): string {
  const date = _parseDateInput(input);
  if (!_isValidDate(date)) {
    return "—";
  }
  return date.toLocaleDateString("ru-RU", MSK_DATE_OPTIONS);
}

/**
 * Форматирует календарную дату YYYY-MM-DD без сдвига по часовому поясу.
 */
export function formatIsoCalendarDateRu(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) {
    return isoDate;
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}

/**
 * Текущий момент в МСК для подписей в отчётах.
 */
export function formatMoscowNow(): string {
  return formatMoscowDateTime(new Date());
}

/** Интервал между напоминаниями о повторном тесте на выгорание. */
export const BURNOUT_RETEST_INTERVAL_MONTHS = 3;

/**
 * Возвращает дату через указанное число календарных месяцев от базовой.
 */
export function addCalendarMonths(base: Date, months: number): Date {
  const result = new Date(base.getTime());
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < day) {
    result.setDate(0);
  }
  return result;
}

/**
 * Дата повторного тестирования на выгорание (через 3 месяца от базовой).
 */
export function burnoutRetestDueAt(base: Date = new Date()): Date {
  return addCalendarMonths(base, BURNOUT_RETEST_INTERVAL_MONTHS);
}
