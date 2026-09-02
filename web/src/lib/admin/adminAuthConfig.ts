import { ADMIN_ROLE_ADMIN, type AdminRole } from "@/lib/admin/adminRoles";

export type AdminAuthConfig = {
  adminEmail: string;
  adminPassword: string;
  sessionSecret: string;
};

/**
 * Нормализует email для сравнения при входе.
 */
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Читает учётные данные администратора и секрет сессий из переменных окружения.
 */
export function readAdminAuthConfig(): AdminAuthConfig | null {
  const adminEmail = process.env.ADMIN_PANEL_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!adminEmail || !adminPassword || !sessionSecret) {
    return null;
  }

  return {
    adminEmail: normalizeAdminEmail(adminEmail),
    adminPassword,
    sessionSecret,
  };
}

/**
 * Проверяет, совпадают ли введённые данные с учётной записью администратора из env.
 */
export function matchesEnvAdmin(
  config: AdminAuthConfig,
  email: string,
  password: string
): boolean {
  return (
    normalizeAdminEmail(email) === config.adminEmail && password === config.adminPassword
  );
}

/**
 * Возвращает роль при успешном совпадении с env-администратором.
 */
export function resolveEnvAdminRole(
  config: AdminAuthConfig,
  email: string,
  password: string
): AdminRole | null {
  return matchesEnvAdmin(config, email, password) ? ADMIN_ROLE_ADMIN : null;
}
