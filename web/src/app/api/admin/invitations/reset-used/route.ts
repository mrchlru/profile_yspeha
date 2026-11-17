import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  resetAccessInviteUsedAt,
  type ResetAccessInviteUsedAtResult,
} from "@/lib/admin/resetAccessInviteUsedAt";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    confirm: z.literal(true),
    inviteId: z.string().min(1).max(64).optional(),
    accessCode: z.string().min(8).max(80).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.inviteId || value.accessCode), {
    message: "inviteId или accessCode",
  });

/**
 * Возвращает код в «Начал проходить» / «Активен», снимая ошибочный used_at.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ResetAccessInviteUsedAtResult | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Нужны confirm:true и inviteId или accessCode" },
      { status: 400 }
    );
  }

  try {
    const result = await resetAccessInviteUsedAt(parsed.data);
    screeningServerLog("admin_invite_reset_used", "ok", {
      code: result.code,
      status: result.status,
      hadUsedAt: result.hadUsedAt,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось сбросить статус";
    screeningServerLog("admin_invite_reset_used", "failed", {
      message: message.slice(0, 300),
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}