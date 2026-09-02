import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  listEmployeeFolderFiles,
  saveEmployeeFolderFile,
} from "@/lib/admin/folderFiles";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
});

export async function GET(
  req: NextRequest
): Promise<NextResponse<{ items: Awaited<ReturnType<typeof listEmployeeFolderFiles>> } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    folderKey: req.nextUrl.searchParams.get("folderKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const items = await listEmployeeFolderFiles(parsed.data.folderKey);
  return NextResponse.json({ items });
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<{ item: Awaited<ReturnType<typeof saveEmployeeFolderFile>> } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректные данные формы" }, { status: 400 });
  }

  const folderKey = String(formData.get("folderKey") ?? "").trim();
  const file = formData.get("file");
  if (!folderKey || !(file instanceof File)) {
    return NextResponse.json({ error: "Укажите папку и файл" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const item = await saveEmployeeFolderFile(
      folderKey,
      file.name,
      file.type,
      buffer,
      auth.user.email
    );
    screeningServerLog("admin_folder_file_upload", "ok", {
      folderKey,
      fileId: item.id,
      sizeBytes: item.sizeBytes,
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось загрузить файл";
    screeningServerLog("admin_folder_file_upload", "error", { folderKey, message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
