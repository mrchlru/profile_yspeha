import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteEmployeeFolderData } from "@/lib/admin/deleteEmployeeFolder";
import { getEmployeeFolderDetail, listEmployeeFolders } from "@/lib/admin/buildEmployeeFolders";
import { requireAdminPanelSession, requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { runDueBurnoutRemindersInBackground } from "@/lib/burnout/runDueBurnoutRemindersInBackground";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(["all", "screening", "audit"]).optional(),
  archive: z.enum(["true", "false"]).optional(),
});

const deleteBodySchema = z.object({
  folderKey: z.string().min(1).max(300),
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("folder") }),
    z.object({ type: z.literal("screening") }),
    z.object({ type: z.literal("invites") }),
    z.object({ type: z.literal("audit") }),
    z.object({ type: z.literal("screeningSubmission"), id: z.string().min(1) }),
    z.object({ type: z.literal("auditSubmission"), id: z.string().min(1) }),
    z.object({ type: z.literal("burnoutSubmission"), id: z.string().min(1) }),
    z.object({ type: z.literal("profSbEducationSubmission"), id: z.string().min(1) }),
    z.object({ type: z.literal("invite"), id: z.string().min(1) }),
  ]),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | { items: Awaited<ReturnType<typeof listEmployeeFolders>> }
    | { folder: NonNullable<Awaited<ReturnType<typeof getEmployeeFolderDetail>>> }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  runDueBurnoutRemindersInBackground("admin_results");

  const folderKey = req.nextUrl.searchParams.get("folderKey")?.trim();
  if (folderKey) {
    const folder = await getEmployeeFolderDetail(folderKey);
    if (!folder) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
    }
    screeningServerLog("admin_results", "folder_ok", { folderKey });
    return NextResponse.json({ folder });
  }

  const parsed = querySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    type: req.nextUrl.searchParams.get("type") ?? undefined,
    archive: req.nextUrl.searchParams.get("archive") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const items = await listEmployeeFolders(
    parsed.data.q,
    parsed.data.type ?? "all",
    parsed.data.archive === "true"
  );
  screeningServerLog("admin_results", "list_ok", { count: items.length });
  return NextResponse.json({ items });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function DELETE(
  req: NextRequest
): Promise<
  NextResponse<
    | { deleted: number; folderRemoved: boolean }
    | { error: string }
  >
> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const result = await deleteEmployeeFolderData(
      parsed.data.folderKey,
      parsed.data.target
    );
    screeningServerLog("admin_results_delete", "ok", {
      folderKey: parsed.data.folderKey,
      targetType: parsed.data.target.type,
      deleted: result.deleted,
      adminEmail: auth.user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось удалить данные";
    screeningServerLog("admin_results_delete", "error", {
      folderKey: parsed.data.folderKey,
      targetType: parsed.data.target.type,
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
