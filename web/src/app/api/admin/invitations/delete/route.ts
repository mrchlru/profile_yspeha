import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteAccessInvite } from "@/lib/admin/deleteAccessInvite";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  inviteId: z.string().min(1).max(64),
});

export async function POST(
  req: NextRequest
): Promise<NextResponse<{ code: string } | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const result = await deleteAccessInvite(parsed.data.inviteId);
    screeningServerLog("admin_invite_delete", "ok", {
      inviteId: result.id,
      code: result.code,
      adminEmail: auth.user.email,
    });
    return NextResponse.json({ code: result.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось удалить приглашение";
    screeningServerLog("admin_invite_delete", "error", {
      inviteId: parsed.data.inviteId,
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
