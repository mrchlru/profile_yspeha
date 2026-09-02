import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  dispatchCommissionEvalSheets,
  getCommissionCandidateEvalStatus,
} from "@/lib/commission/commissionEvalSheets";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  interviewFolderKey: z.string().min(1).max(300),
  candidateFolderKey: z.string().min(1).max(300),
  candidateName: z.string().min(1).max(300),
  positionLevel: z.string().max(80).optional(),
  resendEmails: z.boolean().optional(),
});

export async function POST(
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
    const status = await dispatchCommissionEvalSheets(parsed.data);
    return NextResponse.json({ status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось отправить анкеты";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
