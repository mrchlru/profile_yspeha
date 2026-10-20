import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { runSingleDocumentReportDownload } from "@/lib/admin/runSingleDocumentReportDownload";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  kind: z.enum(["attestation", "burnout", "prof_sb_education", "specialist_screening"]),
  sessionId: z.string().min(1).max(120),
  folderKey: z.string().min(1).max(300),
});

export async function POST(
  req: NextRequest
): Promise<NextResponse<Buffer | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
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
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const result = await runSingleDocumentReportDownload(parsed.data);
  if (!result) {
    return NextResponse.json({ error: "Не удалось сформировать файл" }, { status: 404 });
  }

  screeningServerLog("admin_report_download", "document_ok", {
    kind: parsed.data.kind,
    sessionId: parsed.data.sessionId.slice(0, 12),
  });

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
