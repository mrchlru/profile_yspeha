import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import {
  assertAttestationSessionInFolder,
  buildAttestationReportView,
} from "@/lib/admin/buildAttestationReportView";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import { persistAttestationAiConclusion } from "@/lib/attestation/persistAttestationAiConclusion";
import { computeRosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const codingEntrySchema = z.object({
  direction: z.enum(["E", "I", "M"]),
  reaction: z.enum(["OD", "ED", "NP"]),
});

const bodySchema = z.object({
  folderKey: z.string().min(1).max(300),
  sessionId: z.string().min(1).max(120),
  coding: z.record(z.string(), codingEntrySchema),
  /** Перегенерировать ИИ-заключение после сохранения (по умолчанию true). */
  regenerateConclusion: z.boolean().optional(),
});

/**
 * Сохраняет ручное кодирование Розенцвейга и при необходимости перегенерирует заключение.
 */
export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | { ok: true; view: NonNullable<Awaited<ReturnType<typeof buildAttestationReportView>>> }
    | { ok: true }
    | { error: string }
  >
> {
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
  const generatedAt = formatMoscowNow();

  const existing = await prisma.attestationSubmission.findUnique({
    where: { sessionId: parsed.data.sessionId },
    select: { attestationReport: true, firstName: true, lastName: true },
  });

  const prevReport =
    existing?.attestationReport && typeof existing.attestationReport === "object"
      ? (existing.attestationReport as unknown as AttestationReportJson)
      : null;

  const nextReport: AttestationReportJson | null = prevReport
    ? {
        ...prevReport,
        rosenzweigCodingSummary: summary,
        rosenzweigCodingMeta: {
          source: "manual",
          generatedAt,
        },
      }
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
      codedCount: summary.codedCount,
    });
  } catch (err) {
    screeningServerLog("admin_attestation_rosenzweig_coding", "failed", {
      sessionId: parsed.data.sessionId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const shouldRegen = parsed.data.regenerateConclusion !== false;
  if (shouldRegen && existing) {
    const sessionRef = shortSessionRef(parsed.data.sessionId);
    const personName = `${existing.lastName} ${existing.firstName}`.trim();
    try {
      await persistAttestationAiConclusion({
        sessionId: parsed.data.sessionId,
        sessionRef,
        personName,
      });
      screeningServerLog("admin_attestation_rosenzweig_coding", "conclusion_regenerated", {
        sessionId: parsed.data.sessionId,
      });
    } catch (err) {
      screeningServerLog("admin_attestation_rosenzweig_coding", "conclusion_regen_failed", {
        sessionId: parsed.data.sessionId,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  const view = await buildAttestationReportView(parsed.data.sessionId);
  if (!view) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, view });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
