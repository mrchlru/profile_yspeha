import { NextRequest, NextResponse } from "next/server";

import { readAdminAuthConfig } from "@/lib/admin/adminAuthConfig";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/adminRoles";
import { getAdminSessionFromRequest } from "@/lib/admin/adminSession";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | { authenticated: false }
    | { authenticated: true; email: string; role: string; roleLabel: string }
    | { error: string }
  >
> {
  const config = readAdminAuthConfig();
  if (!config) {
    return NextResponse.json({ error: "Админ-панель не настроена" }, { status: 503 });
  }

  const user = await getAdminSessionFromRequest(req, config.sessionSecret);
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    email: user.email,
    role: user.role,
    roleLabel: ADMIN_ROLE_LABELS[user.role],
  });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
