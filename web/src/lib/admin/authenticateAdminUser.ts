import { ADMIN_ROLE_HRD, type AdminSessionUser } from "@/lib/admin/adminRoles";
import {
  normalizeAdminEmail,
  readAdminAuthConfig,
  resolveEnvAdminRole,
} from "@/lib/admin/adminAuthConfig";
import { verifyPassword } from "@/lib/admin/passwordHash";
import { prisma } from "@/lib/prisma";

export type AdminLoginResult =
  | { ok: true; user: AdminSessionUser }
  | { ok: false; status: number; error: string };

/**
 * Проверяет email и пароль, возвращает роль и нормализованный email при успехе.
 */
export async function authenticateAdminUser(
  email: string,
  password: string
): Promise<AdminLoginResult> {
  const config = readAdminAuthConfig();
  if (!config) {
    return { ok: false, status: 503, error: "Админ-панель не настроена" };
  }

  const normalizedEmail = normalizeAdminEmail(email);
  if (!normalizedEmail || password.length === 0) {
    return { ok: false, status: 400, error: "Укажите почту и пароль" };
  }

  const envRole = resolveEnvAdminRole(config, normalizedEmail, password);
  if (envRole) {
    return { ok: true, user: { role: envRole, email: normalizedEmail } };
  }

  const hrd = await prisma.hrdAccount.findUnique({
    where: { email: normalizedEmail },
    select: { passwordHash: true },
  });

  if (!hrd) {
    return { ok: false, status: 401, error: "Неверная почта или пароль" };
  }

  const valid = await verifyPassword(password, hrd.passwordHash);
  if (!valid) {
    return { ok: false, status: 401, error: "Неверная почта или пароль" };
  }

  return {
    ok: true,
    user: { role: ADMIN_ROLE_HRD, email: normalizedEmail },
  };
}
