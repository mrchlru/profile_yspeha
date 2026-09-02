import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { denyAdminProctorFolderAccessResponse } from "@/lib/proctor/assertAdminProctorFolderAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

/**
 * Отдаёт полную аудиозапись сессии прокторинга для админ-панели.
 */
export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { sessionId } = await context.params;
  const download = req.nextUrl.searchParams.get("download") === "1";
  const folderKey = req.nextUrl.searchParams.get("folderKey") ?? undefined;

  const row = await prisma.proctorSessionAudio.findFirst({
    where: {
      proctorSession: { sessionId },
    },
    select: {
      id: true,
      mimeType: true,
      data: true,
      durationMs: true,
      proctorSession: { select: { sessionId: true, candidateFolderKey: true } },
    },
  });

  if (row === null) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }

  const denied = await denyAdminProctorFolderAccessResponse(
    folderKey,
    row.proctorSession.sessionId,
    row.proctorSession.candidateFolderKey
  );
  if (denied) {
    return denied;
  }

  const headers: Record<string, string> = {
    "Content-Type": row.mimeType || "audio/webm",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (row.durationMs !== null && row.durationMs > 0) {
    headers["X-Proctor-Duration-Ms"] = String(row.durationMs);
  }
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="proctor-session-${sessionId}.webm"`;
  }

  return new NextResponse(new Uint8Array(row.data), {
    status: 200,
    headers,
  });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
