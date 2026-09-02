export const ADMIN_ROLE_ADMIN = "admin" as const;
export const ADMIN_ROLE_HRD = "hrd" as const;

export type AdminRole = typeof ADMIN_ROLE_ADMIN | typeof ADMIN_ROLE_HRD;

export type AdminSessionUser = {
  role: AdminRole;
  email: string;
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Администратор",
  hrd: "HrD",
};

export function isAdminRole(value: string): value is AdminRole {
  return value === ADMIN_ROLE_ADMIN || value === ADMIN_ROLE_HRD;
}
