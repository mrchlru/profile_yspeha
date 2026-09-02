import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/admin/adminSession";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse<{ ok: true }>> {
  const res = NextResponse.json({ ok: true as const });
  clearAdminSessionCookie(res);
  screeningServerLog("admin_auth_logout", "ok", {});
  return res;
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
