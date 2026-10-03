import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  assertSpecialistScreeningSessionInFolder,
  buildSpecialistScreeningReportView,
} from "@/lib/admin/buildSpecialistScreeningReportView";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { shortSessionRef } from "@/lib/logging/screeningSessionRef";
import { persistSpecialistScreeningAiConclusion } from "@/lib/specialistScreening/persistSpecialistScreeningAiConclusion";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  folderKey: z.string().min(1).max(300),
  sessionId: z.string().min(1).max(120),
});

/**
 * Перегенерирует ИИ-заключение по скринингу депрессивных симптомов.
 */
export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        ok: true;
        view: NonNullable<Awaited<ReturnType<typeof buildSpecialistScreeningReportView>>>;
      }
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

  const { folderKey, sessionId } = parsed.data;
  const allowed = await assertSpecialistScreeningSessionInFolder(folderKey, sessionId);
  if (!allowed) {
    return NextResponse.json({ error: "Отчёт не найден в этой папке" }, { status: 404 });
  }

  const row = await prisma.specialistScreeningSubmission.findUnique({
    where: { sessionId },
    select: { firstName: true, lastName: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
  }

  const sessionRef = shortSessionRef(sessionId);
  const personName = `${row.lastName} ${row.firstName}`.trim();

  let persistResult: Awaited<ReturnType<typeof persistSpecialistScreeningAiConclusion>>;
  try {
    persistResult = await persistSpecialistScreeningAiConclusion({
      sessionId,
      sessionRef,
      personName,
    });
  } catch (err) {
    screeningServerLog("admin_specialist_screening_generate_ai", "failed", {
      sessionId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Не удалось сгенерировать заключение" }, { status: 500 });
  }

  if (!persistResult.aiGenerated) {
    const hadPrevious = Boolean(persistResult.conclusionText?.trim());
    return NextResponse.json(
      {
        error: hadPrevious
          ? "Модель не ответила; предыдущее заключение сохранено. Проверьте OPENAI_API_KEY и повторите."
          : "Модель не вернула заключение. Проверьте OPENAI_API_KEY и повторите.",
      },
      { status: 502 }
    );
  }

  const view = await buildSpecialistScreeningReportView(sessionId);
  screeningServerLog("admin_specialist_screening_generate_ai", "ok", { sessionId });
  if (!view) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, view });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
