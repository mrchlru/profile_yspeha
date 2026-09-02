import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  regenerateStoredManagerBriefConclusions,
  type RegenerateManagerBriefBatchResult,
} from "@/lib/admin/regenerateStoredManagerBriefConclusions";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z
  .object({
    confirm: z.literal(true),
    useAi: z.boolean().optional(),
    batchSize: z.number().int().min(1).max(15).optional(),
    afterSessionId: z.string().min(1).max(120).nullable().optional(),
    sessionIds: z.array(z.string().min(1).max(120)).max(20).optional(),
  })
  .strict();

/**
 * Пересчёт заключения «Отчёт для руководителя» (ОД / ТУ) по сохранённым ответам.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<RegenerateManagerBriefBatchResult | { error: string }>> {
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
  screeningServerLog("admin_regenerate_manager_brief", "started", {});

  try {
    const result = await regenerateStoredManagerBriefConclusions({
      useAi: parsedBody.useAi === true,
      batchSize: parsedBody.batchSize,
      afterSessionId: parsedBody.afterSessionId ?? null,
      sessionIds: parsedBody.sessionIds,
    });
    screeningServerLog("admin_regenerate_manager_brief", "finished", {
      durationMs: Date.now() - started,
      updated: result.updated,
      eligible: result.eligible,
      failed: result.failed,
      hasMore: result.hasMore,
      batchEligibleProcessed: result.batchEligibleProcessed,
    });
    return NextResponse.json(result);
  } catch (err) {
    screeningServerLog("admin_regenerate_manager_brief", "failed", {
      durationMs: Date.now() - started,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json(
      { error: "Не удалось пересобрать заключения для руководителя" },
      { status: 500 }
    );
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
