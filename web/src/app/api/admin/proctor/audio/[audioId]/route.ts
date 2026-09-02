import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { denyAdminProctorFolderAccessResponse } from "@/lib/proctor/assertAdminProctorFolderAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ audioId: string }>;
};

/**
 * Отдаёт аудиофрагмент нарушения (webm) для админ-панели.
 */
export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { audioId } = await context.params;
  const download = req.nextUrl.searchParams.get("download") === "1";

  const clip = await prisma.proctorAudioClip.findUnique({
    where: { id: audioId },
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

  if (clip === null) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }

  const folderKey = req.nextUrl.searchParams.get("folderKey") ?? undefined;
  const denied = await denyAdminProctorFolderAccessResponse(
    folderKey,
    clip.event.proctorSession.sessionId,
    clip.event.proctorSession.candidateFolderKey
  );
  if (denied) {
    return denied;
  }

  const headers: Record<string, string> = {
    "Content-Type": clip.mimeType || "audio/webm",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="proctor-audio-${audioId}.webm"`;
  }

  return new NextResponse(new Uint8Array(clip.data), {
    status: 200,
    headers,
  });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
