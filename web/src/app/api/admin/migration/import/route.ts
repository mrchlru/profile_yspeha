import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { importMigrationArchiveZip } from "@/lib/admin/importMigrationArchive";
import type { MigrationImportResult } from "@/lib/admin/migrationArchiveTypes";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Импорт ZIP с медиа может занимать несколько минут. */
export const maxDuration = 300;

const modeSchema = z.enum(["skip", "overwrite"]);

/**
 * Импортирует миграционный ZIP в текущую БД (только полный администратор).
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<MigrationImportResult | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректные данные формы" }, { status: 400 });
  }

  const modeParsed = modeSchema.safeParse(String(formData.get("mode") ?? "skip"));
  if (!modeParsed.success) {
    return NextResponse.json({ error: "Укажите mode: skip или overwrite" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Прикрепите ZIP-файл архива" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip") {
    return NextResponse.json({ error: "Ожидается файл .zip" }, { status: 400 });
  }

  const MAX_BYTES = 500 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Архив слишком большой (лимит 500 МБ)" }, { status: 400 });
  }

  try {
    const zipBytes = new Uint8Array(await file.arrayBuffer());
    const result = await importMigrationArchiveZip({
      zipBytes,
      mode: modeParsed.data,
    });
    const failed = result.tables.reduce((sum, table) => sum + table.failed, 0);
    const inserted = result.tables.reduce((sum, table) => sum + table.inserted, 0);
    const updated = result.tables.reduce((sum, table) => sum + table.updated, 0);
    screeningServerLog("admin_migration_import", failed > 0 ? "partial" : "ok", {
      mode: result.mode,
      inserted,
      updated,
      failed,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    screeningServerLog("admin_migration_import", "failed", { message: message.slice(0, 400) });
    return NextResponse.json(
      { error: message.slice(0, 300) || "Не удалось импортировать архив" },
      { status: 400 }
    );
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
