import { NextRequest, NextResponse } from "next/server";

import { requireProctorAccess } from "@/lib/proctor/requireProctorAccess";
import { analyzeProctorScanFrame } from "@/lib/proctor/proctorScanServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SNAPSHOT_BYTES = 512 * 1024;

/**
 * Периодический YOLO-скан кадра: телефон, отсутствие лица, несколько людей.
 */
export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | { ok: true; violations: ReadonlyArray<{ kind: string; serverEventId: string }> }
    | { error: string }
  >
> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const accessCode = String(formData.get("accessCode") ?? "").trim();
  const widthRaw = String(formData.get("width") ?? "").trim();
  const heightRaw = String(formData.get("height") ?? "").trim();
  const file = formData.get("snapshot");

  if (!sessionId || !accessCode || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const access = await requireProctorAccess(sessionId, accessCode);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json({ error: "Недопустимый размер снимка" }, { status: 400 });
  }

  const width = widthRaw ? Number.parseInt(widthRaw, 10) : null;
  const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;
  const stepLabel = String(formData.get("stepLabel") ?? "").trim() || null;
  const routePath = String(formData.get("routePath") ?? "").trim() || null;

  try {
    const result = await analyzeProctorScanFrame({
      sessionId,
      accessCode,
      candidateFolderKey: access.candidateFolderKey,
      testKind: access.testKind,
      jpegBuffer: buffer,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      stepLabel,
      routePath,
    });

    return NextResponse.json({
      ok: true,
      violations: result.violations.map((item) => ({
        kind: item.kind,
        serverEventId: item.serverEventId,
      })),
    });
  } catch {
    return NextResponse.json({ ok: true, violations: [] });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
