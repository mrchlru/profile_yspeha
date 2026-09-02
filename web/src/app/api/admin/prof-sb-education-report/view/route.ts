import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  assertProfSbEducationSessionInFolder,
  buildProfSbEducationReportView,
} from "@/lib/admin/buildProfSbEducationReportView";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
  sessionId: z.string().min(1).max(120),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    { view: Awaited<ReturnType<typeof buildProfSbEducationReportView>> } | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    folderKey: req.nextUrl.searchParams.get("folderKey") ?? undefined,
    sessionId: req.nextUrl.searchParams.get("sessionId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const allowed = await assertProfSbEducationSessionInFolder(
    parsed.data.folderKey,
    parsed.data.sessionId
  );
  if (!allowed) {
    return NextResponse.json({ error: "Отчёт не найден в этой папке" }, { status: 404 });
  }

  const view = await buildProfSbEducationReportView(parsed.data.sessionId);
  if (!view) {
    return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
  }

  screeningServerLog("admin_prof_sb_education_report_view", "ok", {
    sessionId: parsed.data.sessionId,
  });
  return NextResponse.json({ view });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
