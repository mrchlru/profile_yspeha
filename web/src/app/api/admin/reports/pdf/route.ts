import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  reportPdfSourceFromKind,
  resolveReportPdfKind,
} from "@/lib/admin/buildReportHtmlView";
import { assertFolderReportSession } from "@/lib/admin/folderReportSessions";
import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import { generateAuditManagerReportPdfBySession } from "@/lib/admin/generateAuditManagerReportPdfBySession";
import { generateAuditReportPdfBySession } from "@/lib/admin/generateAuditReportPdfBySession";
import { generateScreeningReportPdfBySession } from "@/lib/admin/generateScreeningReportPdfBySession";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
  documentId: z.enum(["full_report", "manager_report"]),
  sessionId: z.string().min(1).max(120),
});

export async function GET(req: NextRequest): Promise<NextResponse<Buffer | { error: string }>> {
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
  if (!pdfKind) {
    return NextResponse.json({ error: "PDF для этого документа недоступен" }, { status: 404 });
  }

  const source = reportPdfSourceFromKind(pdfKind);
  const allowed = await assertFolderReportSession(folderKey, source, sessionId);
  if (!allowed) {
    return NextResponse.json({ error: "Отчёт не найден в этой папке" }, { status: 404 });
  }

  const pdfBuffer =
    pdfKind === "screening"
      ? await generateScreeningReportPdfBySession(sessionId)
      : pdfKind === "audit_manager"
        ? await generateAuditManagerReportPdfBySession(sessionId)
        : await generateAuditReportPdfBySession(sessionId);

  if (!pdfBuffer) {
    return NextResponse.json({ error: "Не удалось сформировать PDF" }, { status: 500 });
  }

  screeningServerLog("admin_report_view", "pdf_ok", { sessionId, pdfKind });

  const forceDownload = req.nextUrl.searchParams.get("download") === "1";
  const fileStem =
    documentId === "manager_report" ? `manager-report-${sessionId}` : `report-${sessionId}`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": forceDownload
        ? `attachment; filename="${fileStem}.pdf"`
        : `inline; filename="${fileStem}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
