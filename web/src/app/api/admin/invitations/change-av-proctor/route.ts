import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { changeAccessInviteAvProctor } from "@/lib/admin/changeAccessInviteAvProctor";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    inviteId: z.string().trim().min(1).max(80),
    avProctorDisabled: z.boolean(),
  })
  .strict();

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | { id: string; code: string; avProctorDisabled: boolean }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  try {
    const result = await changeAccessInviteAvProctor(
      parsed.data.inviteId,
      parsed.data.avProctorDisabled
    );
    screeningServerLog("admin_invitations_change_av", "ok", {
      inviteId: result.id,
      avProctorDisabled: result.avProctorDisabled,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось обновить приглашение";
    screeningServerLog("admin_invitations_change_av", "failed", { message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
