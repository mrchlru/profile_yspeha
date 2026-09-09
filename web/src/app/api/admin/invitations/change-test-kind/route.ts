import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { changeAccessInviteTestKind } from "@/lib/admin/changeAccessInviteTestKind";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  inviteId: z.string().min(1).max(64),
  testKind: z.string().min(1).max(64),
});

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        id: string;
        code: string;
        testKind: string;
        testKindLabel: string;
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
    const result = await changeAccessInviteTestKind(
      parsed.data.inviteId,
      parsed.data.testKind
    );
    screeningServerLog("admin_invite_change_test_kind", "ok", {
      inviteId: result.id,
      code: result.code,
      testKind: result.testKind,
      adminEmail: auth.user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось изменить тип теста";
    screeningServerLog("admin_invite_change_test_kind", "error", {
      inviteId: parsed.data.inviteId,
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
