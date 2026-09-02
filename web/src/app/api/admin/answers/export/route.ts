import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ANSWERS_EXPORT_FORMATS, ANSWERS_EXPORT_TABLE_LAYOUTS } from "@/lib/admin/answersExportKinds";
import { runAnswersExport } from "@/lib/admin/runAnswersExport";
import { REPORT_EXPORT_TEST_KINDS } from "@/lib/admin/reportExportKinds";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z
  .object({
    scope: z.enum(["all_latest", "selected"]),
    testKind: z.enum(REPORT_EXPORT_TEST_KINDS),
    format: z.enum(ANSWERS_EXPORT_FORMATS).default("csv"),
    tableLayout: z.enum(ANSWERS_EXPORT_TABLE_LAYOUTS).default("combined"),
    sessionIds: z.array(z.string().min(1).max(120)).max(500).optional(),
    folderKeys: z.array(z.string().min(1).max(300)).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope !== "selected") {
      return;
    }
    const hasSessions = (value.sessionIds?.length ?? 0) > 0;
    const hasFolders = (value.folderKeys?.length ?? 0) > 0;
    if (!hasSessions && !hasFolders) {
      ctx.addIssue({
        code: "custom",
        message: "Укажите sessionIds или folderKeys для выбранных людей",
        path: ["sessionIds"],
      });
    }
  });

export async function POST(req: NextRequest): Promise<NextResponse<Buffer | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const { scope, testKind, format, tableLayout, sessionIds, folderKeys } = parsed.data;

  try {
    const result = await runAnswersExport({
      scope,
      testKind,
      format,
      tableLayout,
      sessionIds,
      folderKeys,
    });

    if (!result) {
      return NextResponse.json({ error: "Нет ответов для выгрузки" }, { status: 404 });
    }

    screeningServerLog("admin_answers_export", "download_ok", {
      testKind,
      scope,
      format,
      tableLayout,
      bytes: result.buffer.length,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    screeningServerLog("admin_answers_export", "failed", {
      testKind,
      message: message.slice(0, 400),
    });
    return NextResponse.json(
      { error: "Ошибка при формировании выгрузки ответов." },
      { status: 500 }
    );
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
