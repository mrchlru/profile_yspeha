import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteEmployeeFolderFile,
  getEmployeeFolderFileContent,
} from "@/lib/admin/folderFiles";
import { requireAdminPanelSession, requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
});

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<Uint8Array | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { fileId } = await context.params;
  const parsed = querySchema.safeParse({
    folderKey: req.nextUrl.searchParams.get("folderKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const content = await getEmployeeFolderFileContent(fileId, parsed.data.folderKey);
  if (!content) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  const encodedName = encodeURIComponent(content.fileName);
  const forceDownload = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(content.data), {
    status: 200,
    headers: {
      "Content-Type": content.mimeType,
      "Content-Disposition": forceDownload
        ? `attachment; filename*=UTF-8''${encodedName}`
        : `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { fileId } = await context.params;
  const parsed = querySchema.safeParse({
    folderKey: req.nextUrl.searchParams.get("folderKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const deleted = await deleteEmployeeFolderFile(fileId, parsed.data.folderKey);
  if (!deleted) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  screeningServerLog("admin_folder_file_delete", "ok", {
    fileId,
    folderKey: parsed.data.folderKey,
    adminEmail: auth.user.email,
  });
  return NextResponse.json({ ok: true });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
