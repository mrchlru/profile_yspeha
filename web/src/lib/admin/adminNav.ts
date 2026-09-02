import type { AdminRole } from "@/lib/admin/adminRoles";
import { ADMIN_ROLE_ADMIN, ADMIN_ROLE_HRD } from "@/lib/admin/adminRoles";

export type AdminNavIconId =
  | "create-test"
  | "interview"
  | "invitations"
  | "results"
  | "settings"
  | "timeweb-logs"
  | "institutions";

export type AdminNavItem = {
  iconId: AdminNavIconId;
  href: string;
  label: string;
  roles: ReadonlyArray<AdminRole>;
  description?: string;
  /** Пункт доступен только через иконку в карточке профиля. */
  profileOnly?: boolean;
};

/** Ссылка на раздел настроек (иконка в карточке профиля). */
export const ADMIN_SETTINGS_HREF = "/admin/settings";

/** Ссылка на логи Timeweb (только главный администратор). */
export const ADMIN_TIMEWEB_LOGS_HREF = "/admin/timeweb-logs";

export const ADMIN_NAV_ITEMS: ReadonlyArray<AdminNavItem> = [
  {
    iconId: "create-test",
    href: "/admin/create-test",
    label: "Создать тестирование",
    roles: [ADMIN_ROLE_ADMIN, ADMIN_ROLE_HRD],
    description: "Выпуск приглашений на прохождение тестов",
  },
  {
    iconId: "interview",
    href: "/admin/interview",
    label: "Собеседование",
    roles: [ADMIN_ROLE_ADMIN, ADMIN_ROLE_HRD],
    description: "Вакансии, кандидаты, комиссия и оценочные листы",
  },
  {
    iconId: "invitations",
    href: "/admin/invitations",
    label: "Статус приглашений",
    roles: [ADMIN_ROLE_ADMIN, ADMIN_ROLE_HRD],
    description: "Коды доступа и их текущее состояние",
  },
  {
    iconId: "results",
    href: "/admin/results",
    label: "Результаты тестирования",
    roles: [ADMIN_ROLE_ADMIN, ADMIN_ROLE_HRD],
    description: "Папки сотрудников и отчёты",
  },
  {
    iconId: "settings",
    href: ADMIN_SETTINGS_HREF,
    label: "Настройки",
    roles: [ADMIN_ROLE_ADMIN, ADMIN_ROLE_HRD],
    description: "Доступ, учётные записи и вопросы комиссии",
    profileOnly: true,
  },
  {
    iconId: "timeweb-logs",
    href: ADMIN_TIMEWEB_LOGS_HREF,
    label: "Логи Timeweb",
    roles: [ADMIN_ROLE_ADMIN],
    description: "Runtime и deploy логи на Timeweb Cloud",
    profileOnly: true,
  },
  {
    iconId: "institutions",
    href: "/admin/institutions",
    label: "Учебные заведения",
    roles: [ADMIN_ROLE_ADMIN, ADMIN_ROLE_HRD],
    description: "Справочник вузов и рейтинги",
  },
];

/**
 * Возвращает пункты меню, доступные указанной роли.
 */
export function adminNavItemsForRole(role: AdminRole): ReadonlyArray<AdminNavItem> {
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/**
 * Пункты бокового и мобильного меню (без «Настройки» — они в карточке профиля).
 */
export function adminSidebarNavItemsForRole(role: AdminRole): ReadonlyArray<AdminNavItem> {
  return adminNavItemsForRole(role).filter((item) => !item.profileOnly);
}

/**
 * Проверяет, доступен ли раздел настроек для роли.
 */
export function canAccessAdminSettings(role: AdminRole): boolean {
  return ADMIN_NAV_ITEMS.some(
    (item) => item.href === ADMIN_SETTINGS_HREF && item.roles.includes(role)
  );
}

/**
 * Проверяет, доступны ли логи Timeweb для роли (только главный администратор).
 */
export function canAccessTimewebLogs(role: AdminRole): boolean {
  return ADMIN_NAV_ITEMS.some(
    (item) => item.href === ADMIN_TIMEWEB_LOGS_HREF && item.roles.includes(role)
  );
}

/**
 * Проверяет, активен ли пункт меню для текущего пути.
 */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin/results") {
    return pathname === href || pathname.startsWith("/admin/results/");
  }
  if (href === "/admin/interview") {
    return pathname === href || pathname.startsWith("/admin/interview/");
  }
  if (href === ADMIN_SETTINGS_HREF) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === ADMIN_TIMEWEB_LOGS_HREF) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
