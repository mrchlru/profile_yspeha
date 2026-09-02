import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateAdminUser } from "@/lib/admin/authenticateAdminUser";
import { readAdminAuthConfig } from "@/lib/admin/adminAuthConfig";
import { setAdminSessionCookie } from "@/lib/admin/adminSession";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/adminRoles";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(500),
  })
  .strict();

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | { email: string; role: string; roleLabel: string }
    | { error: string }
  >
> {
  const config = readAdminAuthConfig();
  if (!config) {
    screeningServerLog("admin_auth_login", "env_missing", {});
    return NextResponse.json({ error: "Админ-панель не настроена" }, { status: 503 });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите корректную почту и пароль" }, { status: 400 });
  }

  const result = await authenticateAdminUser(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    screeningServerLog("admin_auth_login", "failed", { status: result.status });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const res = NextResponse.json({
    email: result.user.email,
    role: result.user.role,
    roleLabel: ADMIN_ROLE_LABELS[result.user.role],
  });
  await setAdminSessionCookie(res, result.user, config.sessionSecret);
  screeningServerLog("admin_auth_login", "ok", { role: result.user.role });
  return res;
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
