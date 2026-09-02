/**
 * Сшивает прохождения аудита одного и того же сотрудника между годами.
 *
 * Вход: имя и фамилия, как пользователь ввёл их перед стартом аудита.
 * Выход: канонический ключ `assesseeKey` — `lastName|firstName` в нижнем регистре,
 * с нормализованными пробелами и без диакритики/инвариантов «ё→е».
 *
 * Ключ намеренно простой: ФИО без даты рождения и без email — этого хватает для
 * текущей задачи (HR в админ-панели сам разрешает коллизии тёзок), а в будущем
 * сюда можно добавить ещё одно поле без миграции данных, увеличив `version` и
 * пересчитав индекс на сервере.
 */

const ASSESSEE_KEY_VERSION = 1;

export type AuditAssesseeNameInput = {
  firstName: string;
  lastName: string;
};

export type AuditAssesseeKey = {
  /** Версия алгоритма ключа; пишется в БД вместе с самой записью. */
  version: number;
  /** Канонический ключ для поиска прошлых волн. */
  key: string;
  /** Нормализованное имя для отображения. */
  firstNameDisplay: string;
  /** Нормализованная фамилия для отображения. */
  lastNameDisplay: string;
};

/**
 * Возвращает канонический ключ респондента или `null`, если имя/фамилия пустые
 * после нормализации (например, пользователь ввёл одни пробелы).
 */
export function buildAuditAssesseeKey(
  input: AuditAssesseeNameInput
): AuditAssesseeKey | null {
  const firstNameDisplay = _normalizeDisplay(input.firstName);
  const lastNameDisplay = _normalizeDisplay(input.lastName);
  if (firstNameDisplay.length === 0 || lastNameDisplay.length === 0) {
    return null;
  }
  const key = `${_canonicalize(lastNameDisplay)}|${_canonicalize(firstNameDisplay)}`;
  return {
    version: ASSESSEE_KEY_VERSION,
    key,
    firstNameDisplay,
    lastNameDisplay,
  };
}

/** «Иван   иванович» → «Иван Иванович»; первые буквы каждой части — заглавные. */
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

/** Сводит написание к одному виду для сравнения в БД. */
function _canonicalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}
