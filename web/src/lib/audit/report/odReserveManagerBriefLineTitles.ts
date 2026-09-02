import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";

/**
 * Заголовки строк в «Отчёте для руководителя» для батареи ОД / резерв / ТУ (12 методик).
 * Порядок совпадает с `_buildOdReserveNarrativeSections`.
 */
export const OD_RESERVE_MANAGER_BRIEF_LINE_TITLES: ReadonlyArray<string> = [
  "Скорость принятия решения, склонность к структурированному решению",
  "Коммуникативные и организаторские способности",
  "Отношение к конфликтным ситуациям",
  "Мотивация",
  "Психологическое состояние",
  "Поведение в рабочих ситуациях",
  "Целеустремлённость",
  "Готовность к риску",
  "Стрессоустойчивость",
  "Оценка способности приспосабливаться к новым условиям",
  "Оценка уровня ответственности",
  "Выгорание",
];

/**
 * Возвращает заголовок строки блока «для руководителя» (не меняет заголовки основного отчёта).
 */
export function resolveManagerBriefLineTitle(
  sectionIndex: number,
  defaultTitle: string,
  profile: AuditReportProfile | undefined
): string {
  if (profile !== "od_reserve" && profile !== "tu_management_chef") {
    return defaultTitle;
  }
  if (profile === "tu_management_chef" && sectionIndex === 0) {
    return defaultTitle;
  }
  const titleIndex = sectionIndex - 1;
  if (titleIndex < 0 || titleIndex >= OD_RESERVE_MANAGER_BRIEF_LINE_TITLES.length) {
    return defaultTitle;
  }
  return OD_RESERVE_MANAGER_BRIEF_LINE_TITLES[titleIndex] ?? defaultTitle;
}
