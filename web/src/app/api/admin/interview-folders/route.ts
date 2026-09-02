import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getInterviewFolderByKey, listInterviewFolders } from "@/lib/admin/interviewFolders";
import { listInterviewFolderCandidates } from "@/lib/admin/listInterviewFolderCandidates";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().max(200).optional(),
  folderKey: z.string().min(1).max(300).optional(),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | { items: Awaited<ReturnType<typeof listInterviewFolders>> }
    | {
        folder: NonNullable<Awaited<ReturnType<typeof getInterviewFolderByKey>>>;
        candidates: Awaited<ReturnType<typeof listInterviewFolderCandidates>>;
      }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const folderKey = req.nextUrl.searchParams.get("folderKey")?.trim();
  if (folderKey) {
    const folder = await getInterviewFolderByKey(folderKey);
    if (!folder) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
    }
    const candidates = await listInterviewFolderCandidates(folderKey);
    return NextResponse.json({ folder, candidates });
  }

  const parsed = querySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const items = await listInterviewFolders(parsed.data.q);
  return NextResponse.json({ items });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
