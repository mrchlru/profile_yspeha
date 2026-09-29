import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import { assertAttestationSessionInFolder } from "@/lib/admin/buildAttestationReportView";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { computeRosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const codingEntrySchema = z.object({
  direction: z.enum(["E", "I", "M"]),
  reaction: z.enum(["OD", "ED", "NP"]),
});

const bodySchema = z.object({
  folderKey: z.string().min(1).max(300),
  sessionId: z.string().min(1).max(120),
  coding: z.record(z.string(), codingEntrySchema),
});

/**
 * Сохраняет кодирование ответов Розенцвейга наблюдателем.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const allowed = await assertAttestationSessionInFolder(
    parsed.data.folderKey,
    parsed.data.sessionId
  );
  if (!allowed) {
    return NextResponse.json({ error: "Сессия не найдена в этой папке" }, { status: 404 });
  }

  const summary = computeRosenzweigCodingSummary(parsed.data.coding);

  const existing = await prisma.attestationSubmission.findUnique({
    where: { sessionId: parsed.data.sessionId },
    select: { attestationReport: true },
  });

  const prevReport =
    existing?.attestationReport && typeof existing.attestationReport === "object"
      ? (existing.attestationReport as unknown as AttestationReportJson)
      : null;

  const nextReport: AttestationReportJson | null = prevReport
    ? { ...prevReport, rosenzweigCodingSummary: summary }
    : null;

  try {
    await prisma.attestationSubmission.update({
      where: { sessionId: parsed.data.sessionId },
      data: {
        rosenzweigCoding: parsed.data.coding as Prisma.InputJsonValue,
        ...(nextReport
          ? { attestationReport: nextReport as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    screeningServerLog("admin_attestation_rosenzweig_coding", "saved", {
      sessionId: parsed.data.sessionId,
    });
  } catch (err) {
    screeningServerLog("admin_attestation_rosenzweig_coding", "failed", {
      sessionId: parsed.data.sessionId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
