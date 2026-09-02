import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  regenerateAllStoredReports,
  type RegenerateStoredReportsResult,
} from "@/lib/admin/regenerateAllStoredReports";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict();

/**
 * Пересобирает отчёты по типам тестов (ОД/ТУ/скрининг, ПРОФ СБ, выгорание и т.д.).
 * Только главный администратор.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<RegenerateStoredReportsResult | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let parsedBody: z.infer<typeof bodySchema> | null = null;
  try {
    const jsonBody = await req.json();
    const parsed = bodySchema.safeParse(jsonBody);
    if (parsed.success) {
      parsedBody = parsed.data;
    }
  } catch {
    parsedBody = null;
  }

  if (parsedBody?.confirm !== true) {
    return NextResponse.json(
      { error: "Подтвердите действие: { \"confirm\": true }" },
      { status: 400 }
    );
  }

  const started = Date.now();
  screeningServerLog("admin_regenerate_reports", "started", {});

  try {
    const result = await regenerateAllStoredReports();
    screeningServerLog("admin_regenerate_reports", "finished", {
      durationMs: Date.now() - started,
      auditUpdated: result.managerAssessments.updated,
      screeningUpdated: result.screening.updated,
      profSbUpdated: result.profSbEducation.updated,
      burnoutUpdated: result.burnout.updated,
      errors: result.errors.length,
    });
    return NextResponse.json(result);
  } catch (err) {
    screeningServerLog("admin_regenerate_reports", "failed", {
      durationMs: Date.now() - started,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Не удалось пересобрать отчёты" }, { status: 500 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
