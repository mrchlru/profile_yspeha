import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  applyCandidateFolderLifecycle,
  lookupCandidateByIdentity,
} from "@/lib/admin/candidateFolderLifecycle";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const lookupSchema = z.object({
  lastName: z.string().trim().min(1).max(120),
  firstName: z.string().trim().min(1).max(120),
  middleName: z.string().trim().max(120).optional(),
  birthDate: z.string().trim().min(10).max(10),
});

const lifecycleSchema = z.object({
  folderKey: z.string().min(1).max(300),
  action: z.enum(["hire", "archive", "restore"]),
});

export async function GET(
  req: NextRequest
): Promise<NextResponse<{ match: Awaited<ReturnType<typeof lookupCandidateByIdentity>> } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = lookupSchema.safeParse({
    lastName: req.nextUrl.searchParams.get("lastName") ?? undefined,
    firstName: req.nextUrl.searchParams.get("firstName") ?? undefined,
    middleName: req.nextUrl.searchParams.get("middleName") ?? undefined,
    birthDate: req.nextUrl.searchParams.get("birthDate") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const match = await lookupCandidateByIdentity(parsed.data);
  return NextResponse.json({ match });
}

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    { record: Awaited<ReturnType<typeof applyCandidateFolderLifecycle>> } | { error: string }
  >
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

  const parsed = lifecycleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const record = await applyCandidateFolderLifecycle(
      parsed.data.folderKey,
      parsed.data.action
    );
    screeningServerLog("admin_candidate_lifecycle", parsed.data.action, {
      folderKey: parsed.data.folderKey,
      adminEmail: auth.user.email,
    });
    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось изменить статус";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
