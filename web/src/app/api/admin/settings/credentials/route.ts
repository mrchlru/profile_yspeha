import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { normalizeAdminEmail } from "@/lib/admin/adminAuthConfig";
import { ADMIN_ROLE_HRD } from "@/lib/admin/adminRoles";
import { hashPassword, verifyPassword } from "@/lib/admin/passwordHash";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const putBodySchema = z
  .object({
    currentPassword: z.string().min(1).max(500),
    email: z.string().email().max(320).optional(),
    newPassword: z.string().min(8).max(500).optional(),
  })
  .strict()
  .refine((data) => data.email !== undefined || data.newPassword !== undefined, {
    message: "Укажите новую почту и/или новый пароль",
  });

export async function PUT(
  req: NextRequest
): Promise<NextResponse<{ email: string; updatedAt: string } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.user.role !== ADMIN_ROLE_HRD) {
    return NextResponse.json(
      {
        error:
          "Для администратора почта и пароль задаются в переменных окружения ADMIN_PANEL_EMAIL и ADMIN_PANEL_PASSWORD.",
      },
      { status: 403 }
    );
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Укажите текущий пароль и новую почту и/или пароль (от 8 символов)" },
      { status: 400 }
    );
  }

  const account = await prisma.hrdAccount.findUnique({
    where: { email: auth.user.email },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Учётная запись не найдена" }, { status: 404 });
  }

  const currentValid = await verifyPassword(parsed.data.currentPassword, account.passwordHash);
  if (!currentValid) {
    return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 401 });
  }

  const nextEmail = parsed.data.email
    ? normalizeAdminEmail(parsed.data.email)
    : account.email;
  const nextPasswordHash = parsed.data.newPassword
    ? await hashPassword(parsed.data.newPassword)
    : account.passwordHash;

  const row = await prisma.hrdAccount.update({
    where: { id: account.id },
    data: {
      email: nextEmail,
      passwordHash: nextPasswordHash,
    },
    select: { email: true, updatedAt: true },
  });

  screeningServerLog("admin_settings_credentials", "updated", { role: ADMIN_ROLE_HRD });
  return NextResponse.json({
    email: row.email,
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
