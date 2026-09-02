import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { listInviteEmployeeOptions } from "@/lib/admin/getInviteEmployeeByFolderKey";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().max(200).optional(),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | { items: Awaited<ReturnType<typeof listInviteEmployeeOptions>> }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const items = await listInviteEmployeeOptions(parsed.data.q);
  screeningServerLog("admin_invite_employees", "ok", { count: items.length });
  return NextResponse.json({ items });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
