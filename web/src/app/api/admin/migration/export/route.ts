import { NextRequest, NextResponse } from "next/server";

import { buildMigrationArchiveZip } from "@/lib/admin/buildMigrationArchive";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Полный дамп БД с медиа прокторинга может занимать несколько минут. */
export const maxDuration = 300;

/**
 * Скачивает ZIP-архив всех пользовательских данных для переноса инстанса.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { buffer, manifest } = await buildMigrationArchiveZip();
    const stamp = manifest.exportedAt.replace(/[:\s]/g, "-").slice(0, 19);
    const fileName = `migration-archive-${stamp}.zip`;
    screeningServerLog("admin_migration_export", "ok", {
      tables: manifest.tables.length,
      rows: manifest.tables.reduce((sum, table) => sum + table.rowCount, 0),
      bytes: buffer.byteLength,
    });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Migration-Version": String(manifest.version),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    screeningServerLog("admin_migration_export", "failed", { message: message.slice(0, 400) });
    return NextResponse.json(
      { error: "Не удалось собрать архив миграции. Попробуйте позже." },
      { status: 500 }
    );
  }
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
