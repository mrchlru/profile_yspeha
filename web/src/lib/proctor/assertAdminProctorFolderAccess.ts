import { NextResponse } from "next/server";

import { proctorSessionBelongsToAdminFolder } from "@/lib/proctor/proctorFolderAccess";

/**
 * Возвращает 403, если proctor-сессия не относится к папке из query `folderKey`.
 */
export async function denyAdminProctorFolderAccessResponse(
  folderKey: string | undefined,
  sessionId: string,
  candidateFolderKey: string | null
): Promise<NextResponse<{ error: string }> | null> {
  const trimmedFolderKey = folderKey?.trim();
  if (!trimmedFolderKey) {
    return null;
  }

  const allowed = await proctorSessionBelongsToAdminFolder(
    sessionId,
    candidateFolderKey,
    trimmedFolderKey
  );
  if (!allowed) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return null;
}
