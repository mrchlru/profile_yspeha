import { NextRequest, NextResponse } from "next/server";

import { getEmployeeFolderFileContent } from "@/lib/admin/folderFiles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string; fileId: string }>;
};

/**
 * Скачивание резюме кандидата по токену оценочного листа.
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { token, fileId } = await context.params;
  const decodedToken = decodeURIComponent(token);
  const decodedFileId = decodeURIComponent(fileId);

  const sheet = await prisma.commissionEvalSheet.findUnique({
    where: { accessToken: decodedToken },
    select: { candidateFolderKey: true },
  });
  if (!sheet) {
    return NextResponse.json({ error: "Ссылка недействительна" }, { status: 404 });
  }

  const file = await getEmployeeFolderFileContent(decodedFileId, sheet.candidateFolderKey);
  if (!file) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
    },
  });
}
