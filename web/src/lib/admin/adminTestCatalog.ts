import {
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_BURNOUT,
  TEST_KIND_PROF_SB_EDUCATION,
  TEST_KIND_SCREENING,
  type TestKind,
} from "@/lib/access/testKinds";

export const ADMIN_TEST_CATALOG_ID_SCREENING = "screening" as const;
export const ADMIN_TEST_CATALOG_ID_AUDIT_SENIOR = "audit_senior" as const;
export const ADMIN_TEST_CATALOG_ID_AUDIT_MIDDLE = "audit_middle" as const;
export const ADMIN_TEST_CATALOG_ID_BURNOUT = "burnout" as const;
export const ADMIN_TEST_CATALOG_ID_PROF_SB_EDUCATION = "prof_sb_education" as const;

export type AdminTestCatalogId =
  | typeof ADMIN_TEST_CATALOG_ID_SCREENING
  | typeof ADMIN_TEST_CATALOG_ID_AUDIT_SENIOR
  | typeof ADMIN_TEST_CATALOG_ID_AUDIT_MIDDLE
  | typeof ADMIN_TEST_CATALOG_ID_BURNOUT
  | typeof ADMIN_TEST_CATALOG_ID_PROF_SB_EDUCATION;

export type AdminTestCatalogItem = {
  id: AdminTestCatalogId;
  title: string;
  description: string;
  available: boolean;
  /** Связанный testKind для API приглашений (только если available). */
  inviteTestKind?: TestKind;
  /** Можно выбрать сотрудника из архива скрининга или создать нового. */
  supportsEmployeePick?: boolean;
};

export const ADMIN_TEST_CATALOG: ReadonlyArray<AdminTestCatalogItem> = [
  {
    id: ADMIN_TEST_CATALOG_ID_SCREENING,
    title: "Скрининг",
    description:
      "Анкета ПРОФ СБ и 5 методик: интеллект (Кеттелл), конфликт, мотивация, выгорание, тест на сектантство. Порядок прохождения случайный, отчёт — фиксированный. Код действует 3 суток.",
    available: true,
    inviteTestKind: TEST_KIND_SCREENING,
  },
  {
    id: ADMIN_TEST_CATALOG_ID_AUDIT_SENIOR,
    title: "ТУ, шефы и управляющие",
    description:
      "Анкета ПРОФ СБ и 12 методик: интеллект, мотивация, конфликт, выгорание и др. Порядок прохождения случайный, отчёт — фиксированный. Код действует 3 суток.",
    available: true,
    inviteTestKind: TEST_KIND_AUDIT_SENIOR,
    supportsEmployeePick: true,
  },
  {
    id: ADMIN_TEST_CATALOG_ID_AUDIT_MIDDLE,
    title: "ОД и кадровый резерв",
    description:
      "13 методик для руководителей: интеллект, мотивация, конфликт, выгорание, тест на сектантство и др. Порядок прохождения случайный, отчёт — фиксированный. Код действует 3 суток.",
    available: true,
    inviteTestKind: TEST_KIND_AUDIT_MIDDLE,
    supportsEmployeePick: true,
  },
  {
    id: ADMIN_TEST_CATALOG_ID_BURNOUT,
    title: "Тест на выгорание",
    description:
      "Приглашение для сотрудника из архива скрининга или с новыми данными. Код действует 3 суток.",
    available: true,
    inviteTestKind: TEST_KIND_BURNOUT,
    supportsEmployeePick: true,
  },
  {
    id: ADMIN_TEST_CATALOG_ID_PROF_SB_EDUCATION,
    title: "ПРОФ СБ + ПРОФ образование",
    description:
      "Комплексная анкета из двух блоков: ПРОФ СБ и ПРОФ образование. Приглашение для сотрудника из архива скрининга или с новыми данными. Код действует 3 суток.",
    available: true,
    inviteTestKind: TEST_KIND_PROF_SB_EDUCATION,
    supportsEmployeePick: true,
  },
];

/**
 * Возвращает элемент каталога по идентификатору.
 */
export function getAdminTestCatalogItem(id: AdminTestCatalogId): AdminTestCatalogItem | null {
  return ADMIN_TEST_CATALOG.find((item) => item.id === id) ?? null;
}
