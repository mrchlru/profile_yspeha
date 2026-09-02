import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCommissionCandidateEvalStatus } from "@/lib/commission/commissionEvalSheets";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  interviewFolderKey: z.string().min(1).max(300),
  candidateFolderKey: z.string().min(1).max(300),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    { status: Awaited<ReturnType<typeof getCommissionCandidateEvalStatus>> } | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    interviewFolderKey: req.nextUrl.searchParams.get("interviewFolderKey") ?? undefined,
    candidateFolderKey: req.nextUrl.searchParams.get("candidateFolderKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const status = await getCommissionCandidateEvalStatus(
    parsed.data.interviewFolderKey,
    parsed.data.candidateFolderKey
  );
  return NextResponse.json({ status });
}
