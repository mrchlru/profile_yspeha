import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createInterviewCommissionMember,
  listInterviewCommissionMembers,
} from "@/lib/admin/interviewCommissionMembers";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  folderKey: z.string().min(1).max(300),
});

const createBodySchema = z.object({
  interviewFolderKey: z.string().min(1).max(300),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    { items: Awaited<ReturnType<typeof listInterviewCommissionMembers>> } | { error: string }
  >
> {
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

  const items = await listInterviewCommissionMembers(parsed.data.folderKey);
  return NextResponse.json({ items });
}

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<{ item: Awaited<ReturnType<typeof createInterviewCommissionMember>> } | { error: string }>
> {
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

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const item = await createInterviewCommissionMember(parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось добавить участника";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
