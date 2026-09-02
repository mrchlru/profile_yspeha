import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildReportHtmlView,
  resolveReportPdfKind,
} from "@/lib/admin/buildReportHtmlView";
import { documentReportSource } from "@/lib/admin/employeeFolderKey";
import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const DOCUMENT_IDS = [
  "resume",
  "short_report",
  "full_report",
  "manager_report",
  "violations_report",
  "commission_reports",
  "dashboard",
] as const;

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
  documentId: z.enum(DOCUMENT_IDS),
  sessionId: z.string().min(1).max(120),
});

export async function GET(
  req: NextRequest
): Promise<NextResponse<{ view: Awaited<ReturnType<typeof buildReportHtmlView>> } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    folderKey: req.nextUrl.searchParams.get("folderKey") ?? undefined,
    documentId: req.nextUrl.searchParams.get("documentId") ?? undefined,
    sessionId: req.nextUrl.searchParams.get("sessionId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const { folderKey, documentId, sessionId } = parsed.data;
  const pdfKind = resolveReportPdfKind(folderKey, documentId as EmployeeDocumentSlotId);
  if (pdfKind) {
    return NextResponse.json({ error: "Для этого документа используйте PDF-просмотр" }, { status: 400 });
  }

  if (documentId !== "violations_report") {
    const source = documentReportSource(documentId, folderKey);
    if (!source) {
      return NextResponse.json({ error: "Просмотр этого документа пока недоступен" }, { status: 404 });
    }
  }

  const view = await buildReportHtmlView(folderKey, documentId, sessionId);
  if (!view) {
    return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
  }

  screeningServerLog("admin_report_view", "html_ok", { documentId, sessionId });
  return NextResponse.json({ view });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
