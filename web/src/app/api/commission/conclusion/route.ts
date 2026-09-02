import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  candidateFolderKey: z.string().min(1).max(300),
});

/**
 * HTML-отчёт «Заключение комиссии» по кандидату.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    candidateFolderKey: req.nextUrl.searchParams.get("candidateFolderKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const row = await prisma.commissionCandidateConclusion.findUnique({
    where: { candidateFolderKey: parsed.data.candidateFolderKey },
  });
  if (!row) {
    return NextResponse.json({ error: "Заключение ещё не сформировано" }, { status: 404 });
  }

  return new NextResponse(row.reportHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
