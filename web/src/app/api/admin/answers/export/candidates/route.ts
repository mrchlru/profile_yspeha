import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { listReportExportCandidates } from "@/lib/admin/listReportExportCandidates";
import {
  isReportExportTestKind,
  REPORT_EXPORT_TEST_KINDS,
} from "@/lib/admin/reportExportKinds";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  testKind: z.enum(REPORT_EXPORT_TEST_KINDS),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | { candidates: Awaited<ReturnType<typeof listReportExportCandidates>> }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const testKindParam = req.nextUrl.searchParams.get("testKind") ?? "";
  if (!isReportExportTestKind(testKindParam)) {
    return NextResponse.json({ error: "Некорректный тип теста" }, { status: 400 });
  }

  const parsed = querySchema.safeParse({ testKind: testKindParam });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const candidates = await listReportExportCandidates(parsed.data.testKind);
  screeningServerLog("admin_answers_export", "candidates_ok", {
    testKind: parsed.data.testKind,
    count: candidates.length,
  });
  return NextResponse.json({ candidates });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
