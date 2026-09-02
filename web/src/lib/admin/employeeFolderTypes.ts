import type { CandidateLifecycleStatus } from "@/lib/admin/candidateFolderTypes";
import type { EmployeeDashboardVisual } from "@/lib/admin/employeeDashboardTypes";

export type EmployeeDocumentSlotId =
  | "resume"
  | "short_report"
  | "full_report"
  | "manager_report"
  | "violations_report"
  | "commission_reports"
  | "dashboard";

export type EmployeeDocumentSlot = {
  id: EmployeeDocumentSlotId;
  title: string;
  description: string;
  available: boolean;
  /** Способ просмотра в приложении. */
  viewKind: "pdf" | "html" | "none";
};

export type EmployeeFolderFileSummary = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  categoryLabel: string;
  createdAt: string;
  uploadedBy: string;
};

export type EmployeeFolderSummary = {
  key: string;
  displayName: string;
  lastName: string | null;
  firstName: string | null;
  hasScreening: boolean;
  hasAudit: boolean;
  hasInterview: boolean;
  lastActivityAt: string | null;
  screeningSessions: number;
  auditSessions: number;
  positionLevel: string | null;
  positionLevelLabel: string | null;
  birthDate: string | null;
  pendingInvite: boolean;
  middleName: string | null;
  lifecycleStatus: CandidateLifecycleStatus | null;
  isArchived: boolean;
};

export type EmployeeFolderDetail = EmployeeFolderSummary & {
  documents: ReadonlyArray<EmployeeDocumentSlot>;
  dashboardPreview: {
    criticalIndicators: ReadonlyArray<string>;
    yearOverYearNote: string;
    profileSummary: string;
    applicableMotivation: string;
  };
  /** Данные для графиков и визуальных блоков дашборда. */
  dashboardVisual: EmployeeDashboardVisual;
  /** Записи в папке (для управления данными администратором). */
  dataItems: ReadonlyArray<EmployeeFolderDataItem>;
  /** Сессии с готовыми отчётами для просмотра. */
  reportSessions: ReadonlyArray<{
    sessionId: string;
    source: "screening" | "audit";
    label: string;
    createdAt: string;
  }>;
  /** Прохождения теста на выгорание (Маслач). */
  burnoutSessions: ReadonlyArray<{
    sessionId: string;
    label: string;
    createdAt: string;
    classicBurnout: boolean;
    hasConcerningScale: boolean;
  }>;
  /** Прохождения анкеты ПРОФ СБ + ПРОФ образование. */
  profSbEducationSessions: ReadonlyArray<{
    sessionId: string;
    label: string;
    createdAt: string;
    pendingMethodology: boolean;
  }>;
  /** Файлы, загруженные вручную в папку. */
  uploadedFiles: ReadonlyArray<EmployeeFolderFileSummary>;
};

export type EmployeeFolderDataKind =
  | "screening"
  | "audit"
  | "invite"
  | "burnout"
  | "profSbEducation";

export type EmployeeFolderDataItem = {
  kind: EmployeeFolderDataKind;
  id: string;
  label: string;
  createdAt: string;
};

export const EMPLOYEE_DOCUMENT_SLOTS: ReadonlyArray<{
  id: EmployeeDocumentSlotId;
  title: string;
  description: string;
}> = [
  {
    id: "resume",
    title: "Резюме",
    description: "Резюме соискателя после скрининга и собеседования.",
  },
  {
    id: "short_report",
    title: "Короткий отчёт",
    description: "Сводка для руководителя.",
  },
  {
    id: "full_report",
    title: "Объёмный отчёт",
    description: "Полный отчёт для HrD.",
  },
  {
    id: "manager_report",
    title: "Отчёт для руководителя",
    description: "Отдельный PDF с краткими выводами и заключением для руководителя.",
  },
  {
    id: "violations_report",
    title: "Отчёт по нарушениям",
    description:
      "Звуковые и видеонарушения при прохождении тестов с прокторингом: время (МСК), снимки и записи звука.",
  },
  {
    id: "commission_reports",
    title: "Отчёты комиссии",
    description: "Оценочная карта комиссии по найму (скрининг + собеседование).",
  },
  {
    id: "dashboard",
    title: "Дашборд по сотруднику",
    description:
      "Критические показатели, динамика год к году, профиль и применимая мотивация.",
  },
];

/**
 * Нормализует имя профиля скрининга в ключ папки.
 */
export function screeningProfileToFolderKey(profileName: string): string {
  return profileName.trim().toLowerCase().replace(/\s+/g, " ");
}
