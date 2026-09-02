import type { Step4CourseEntry, Step4Data, Step4EducationEntry } from "@/lib/step4/step4Types";

/** Порог «устаревшего» обучения в полных годах. */
export const EDUCATION_STALE_YEARS = 2;

/** Минимум курсов для вывода о высокой обучаемости. */
export const EDUCATION_MOTIVATED_MIN_COURSES = 2;

export type EducationLearningVerdict = "motivated" | "stale" | "insufficient_data";

export type EducationLearningAnalysis = {
  verdict: EducationLearningVerdict;
  conclusionText: string;
  filledCourseCount: number;
  latestActivityYear: number | null;
  yearsSinceLatestActivity: number | null;
};

const STALE_CONCLUSION =
  "Образование и профессиональное обучение давно не обновлялись: последняя зафиксированная учёба " +
  "или курс относятся к периоду более двух лет назад. Формально профиль выглядит «замороженным» — " +
  "человек не демонстрирует регулярного обучения и профессионального совершенствования. " +
  "С высокой вероятностью мотивация к развитию снижена или утрачена.";

const MOTIVATED_CONCLUSION =
  "Кандидат активно инвестирует в обучение: в анкете указано несколько курсов и программ " +
  "повышения квалификации, в том числе недавние. Это указывает на устойчивую мотивацию к " +
  "профессиональному развитию и готовность осваивать новые компетенции. Человек движется " +
  "в профессиональном ключе, а не останавливается на полученном ранее дипломе.";

const YEAR_PATTERN = /\b(19|20)\d{2}\b/g;

/**
 * Анализирует блок образования и курсов анкеты step-4 и формирует управленческий вывод.
 */
export function analyzeEducationLearningMotivation(
  data: Step4Data,
  now: Date = new Date()
): EducationLearningAnalysis {
  const filledCourses = data.courses.filter(_isFilledCourse);
  const latestActivityDate = _resolveLatestActivityDate(data.educationEntries, filledCourses);
  const yearsSince =
    latestActivityDate !== null ? _yearsBetween(latestActivityDate, now) : null;
  const hasRecentActivity =
    yearsSince !== null && yearsSince <= EDUCATION_STALE_YEARS;

  if (_isMotivatedProfile(filledCourses, hasRecentActivity)) {
    return {
      verdict: "motivated",
      conclusionText: MOTIVATED_CONCLUSION,
      filledCourseCount: filledCourses.length,
      latestActivityYear: latestActivityDate?.getFullYear() ?? null,
      yearsSinceLatestActivity: yearsSince,
    };
  }

  if (_isStaleProfile(filledCourses, yearsSince, data.educationEntries, now)) {
    return {
      verdict: "stale",
      conclusionText: STALE_CONCLUSION,
      filledCourseCount: filledCourses.length,
      latestActivityYear: latestActivityDate?.getFullYear() ?? null,
      yearsSinceLatestActivity: yearsSince,
    };
  }

  return {
    verdict: "insufficient_data",
    conclusionText: "",
    filledCourseCount: filledCourses.length,
    latestActivityYear: latestActivityDate?.getFullYear() ?? null,
    yearsSinceLatestActivity: yearsSince,
  };
}

/**
 * Текст заключения для отчёта или пустая строка, если данных недостаточно.
 */
export function buildEducationLearningConclusionText(
  data: Step4Data,
  now: Date = new Date()
): string {
  return analyzeEducationLearningMotivation(data, now).conclusionText;
}

function _isMotivatedProfile(
  filledCourses: ReadonlyArray<Step4CourseEntry>,
  hasRecentActivity: boolean
): boolean {
  return filledCourses.length >= EDUCATION_MOTIVATED_MIN_COURSES && hasRecentActivity;
}

function _isStaleProfile(
  filledCourses: ReadonlyArray<Step4CourseEntry>,
  yearsSince: number | null,
  educationEntries: ReadonlyArray<Step4EducationEntry>,
  now: Date
): boolean {
  if (yearsSince !== null && yearsSince > EDUCATION_STALE_YEARS) {
    return true;
  }
  if (filledCourses.length > 0) {
    return false;
  }
  const educationEnd = _resolveLatestEducationEndDate(educationEntries);
  if (educationEnd === null) {
    return false;
  }
  return _yearsBetween(educationEnd, now) > EDUCATION_STALE_YEARS;
}

function _isFilledCourse(course: Step4CourseEntry): boolean {
  return (
    course.period.trim().length > 0 ||
    course.institutionAndCourse.trim().length > 0 ||
    course.duration.trim().length > 0
  );
}

function _resolveLatestActivityDate(
  educationEntries: ReadonlyArray<Step4EducationEntry>,
  courses: ReadonlyArray<Step4CourseEntry>
): Date | null {
  const candidates: Date[] = [];
  const educationEnd = _resolveLatestEducationEndDate(educationEntries);
  if (educationEnd !== null) {
    candidates.push(educationEnd);
  }
  for (const course of courses) {
    const courseDate = _parseLatestDateFromText(course.period);
    if (courseDate !== null) {
      candidates.push(courseDate);
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return candidates.reduce((latest, item) => (item > latest ? item : latest));
}

function _resolveLatestEducationEndDate(
  educationEntries: ReadonlyArray<Step4EducationEntry>
): Date | null {
  const candidates: Date[] = [];
  for (const entry of educationEntries) {
    const end = _parseYearEndDate(entry.yearEnd) ?? _parseYearEndDate(entry.yearStart);
    if (end !== null) {
      candidates.push(end);
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return candidates.reduce((latest, item) => (item > latest ? item : latest));
}

function _parseYearEndDate(raw: string): Date | null {
  const year = _parseSingleYear(raw);
  if (year === null) {
    return null;
  }
  return new Date(year, 11, 31);
}

function _parseLatestDateFromText(raw: string): Date | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const years = _extractYears(trimmed);
  if (years.length === 0) {
    return null;
  }
  const maxYear = Math.max(...years);
  return new Date(maxYear, 11, 31);
}

function _extractYears(text: string): number[] {
  const matches = text.match(YEAR_PATTERN);
  if (matches === null) {
    return [];
  }
  const years = matches
    .map((value) => Number.parseInt(value, 10))
    .filter((year) => Number.isFinite(year) && year >= 1950 && year <= 2100);
  return years;
}

function _parseSingleYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^\d{4}$/.test(trimmed)) {
    const year = Number.parseInt(trimmed, 10);
    return Number.isFinite(year) ? year : null;
  }
  const years = _extractYears(trimmed);
  if (years.length === 0) {
    return null;
  }
  return Math.max(...years);
}

function _yearsBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
}
