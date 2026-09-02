import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  reportExportSupportsManagerVariant,
  REPORT_EXPORT_TEST_KINDS,
} from "@/lib/admin/reportExportKinds";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { runReportExport } from "@/lib/admin/runReportExport";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
/** Массовая генерация PDF может занимать несколько минут. */
export const maxDuration = 300;

const bodySchema = z
  .object({
    scope: z.enum(["all_latest", "selected"]),
    testKind: z.enum(REPORT_EXPORT_TEST_KINDS),
    reportVariant: z.enum(["full", "manager"]).default("full"),
    fileFormat: z.enum(["pdf", "docx", "both"]).default("pdf"),
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
        message: "Укажите sessionIds или folderKeys для выбранных отчётов",
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

  const { scope, testKind, reportVariant, fileFormat, sessionIds, folderKeys } = parsed.data;

  if (
    reportVariant === "manager" &&
    !reportExportSupportsManagerVariant(testKind)
  ) {
    return NextResponse.json(
      { error: "Отчёт для руководителя доступен только для ОД и ТУ" },
      { status: 400 }
    );
  }

  let result: Awaited<ReturnType<typeof runReportExport>>;
  try {
    result = await runReportExport({
      scope,
      testKind,
      variant: reportVariant,
      fileFormat,
      sessionIds,
      folderKeys,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    screeningServerLog("admin_report_export", "failed", { testKind, message: message.slice(0, 400) });
    return NextResponse.json(
      { error: "Ошибка при формировании файлов. Попробуйте выбрать меньше людей." },
      { status: 500 }
    );
  }

  if (!result) {
    return NextResponse.json({ error: "Нет отчётов для выгрузки" }, { status: 404 });
  }

  screeningServerLog("admin_report_export", "download_ok", {
    testKind,
    scope,
    reportVariant,
    fileFormat,
    kind: result.kind,
  });

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.kind === "archive" ? result.contentType : result.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
