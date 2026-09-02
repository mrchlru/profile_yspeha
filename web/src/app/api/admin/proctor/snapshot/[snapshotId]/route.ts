import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { denyAdminProctorFolderAccessResponse } from "@/lib/proctor/assertAdminProctorFolderAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ snapshotId: string }>;
};

/**
 * Отдаёт JPEG-снимок нарушения прокторинга (только для админ-панели).
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { snapshotId } = await context.params;
  const snapshot = await prisma.proctorSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      mimeType: true,
      data: true,
      event: {
        select: {
          proctorSession: { select: { sessionId: true, candidateFolderKey: true } },
        },
      },
    },
  });

  if (snapshot === null) {
    return NextResponse.json({ error: "Снимок не найден" }, { status: 404 });
  }

  const folderKey = req.nextUrl.searchParams.get("folderKey") ?? undefined;
  const denied = await denyAdminProctorFolderAccessResponse(
    folderKey,
    snapshot.event.proctorSession.sessionId,
    snapshot.event.proctorSession.candidateFolderKey
  );
  if (denied) {
    return denied;
  }

  return new NextResponse(new Uint8Array(snapshot.data), {
    status: 200,
    headers: {
      "Content-Type": snapshot.mimeType || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
