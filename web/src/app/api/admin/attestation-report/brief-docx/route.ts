import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { assertAttestationSessionInFolder } from "@/lib/admin/buildAttestationReportView";
import { formatReportExportFileStem } from "@/lib/admin/formatReportExportFileName";
import { generateAttestationBriefReportDocxBySession } from "@/lib/admin/generateAttestationBriefReportDocxBySession";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
  sessionId: z.string().min(1).max(120),
});

export async function GET(
  req: NextRequest
): Promise<NextResponse<Buffer | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    folderKey: req.nextUrl.searchParams.get("folderKey") ?? "",
    sessionId: req.nextUrl.searchParams.get("sessionId") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const { folderKey, sessionId } = parsed.data;
  const allowed = await assertAttestationSessionInFolder(folderKey, sessionId);
  if (!allowed) {
    return NextResponse.json({ error: "Сессия не найдена в папке" }, { status: 404 });
  }

  const buffer = await generateAttestationBriefReportDocxBySession(sessionId);
  if (!buffer || buffer.length === 0) {
    return NextResponse.json(
      { error: "Краткий отчёт ещё не сформирован. Запустите перегенерацию с ИИ." },
      { status: 404 }
    );
  }

  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: { lastName: true, firstName: true, createdAt: true },
  });
  const stem = row
    ? formatReportExportFileStem(row.lastName, row.firstName, row.createdAt)
    : "attestation_brief";
  const fileName = `${stem}_kratko.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
