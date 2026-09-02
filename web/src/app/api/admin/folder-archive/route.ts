import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { applyCandidateFolderLifecycle } from "@/lib/admin/candidateFolderLifecycle";
import {
  isFolderArchiveMarked,
  markFolderArchived,
  unmarkFolderArchived,
} from "@/lib/admin/folderArchiveMark";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  folderKey: z.string().min(1).max(300),
  action: z.enum(["archive", "restore"]),
});

export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
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

  const { folderKey, action } = parsed.data;

  try {
    if (folderKey.startsWith("candidate:")) {
      await applyCandidateFolderLifecycle(
        folderKey,
        action === "archive" ? "archive" : "restore"
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "archive") {
      await markFolderArchived(folderKey);
    } else {
      await unmarkFolderArchived(folderKey);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось изменить статус";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<{ archived: boolean } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const folderKey = req.nextUrl.searchParams.get("folderKey")?.trim();
  if (!folderKey) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const archived = await isFolderArchiveMarked(folderKey);
  return NextResponse.json({ archived });
}
