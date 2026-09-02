import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteInterviewCommissionMember } from "@/lib/admin/interviewCommissionMembers";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
});

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { memberId } = await context.params;
  const parsed = querySchema.safeParse({
    folderKey: req.nextUrl.searchParams.get("folderKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    await deleteInterviewCommissionMember(memberId, parsed.data.folderKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось удалить участника";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
