import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { extendAccessInvite } from "@/lib/admin/extendAccessInvite";
import { INVITE_STATUS_LABELS } from "@/lib/admin/inviteStatus";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  inviteId: z.string().min(1).max(64),
});

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        id: string;
        code: string;
        expiresAt: string;
        status: string;
        statusLabel: string;
        extendedDays: number;
      }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
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
    const result = await extendAccessInvite(parsed.data.inviteId);
    screeningServerLog("admin_invite_extend", "ok", {
      inviteId: result.id,
      code: result.code,
      extendedDays: result.extendedDays,
      adminEmail: auth.user.email,
    });
    return NextResponse.json({
      id: result.id,
      code: result.code,
      expiresAt: result.expiresAt.toISOString(),
      status: result.status,
      statusLabel: INVITE_STATUS_LABELS[result.status],
      extendedDays: result.extendedDays,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось продлить код";
    screeningServerLog("admin_invite_extend", "error", {
      inviteId: parsed.data.inviteId,
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
