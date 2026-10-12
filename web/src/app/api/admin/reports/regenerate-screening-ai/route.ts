import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  regenerateStoredScreeningAiConclusions,
  type RegenerateScreeningAiBatchResult,
} from "@/lib/admin/regenerateStoredScreeningAiConclusions";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z
  .object({
    confirm: z.literal(true),
    forceAll: z.boolean().optional(),
    batchSize: z.number().int().min(1).max(10).optional(),
    afterSessionId: z.string().min(1).max(120).nullable().optional(),
    sessionIds: z.array(z.string().min(1).max(120)).max(20).optional(),
  })
  .strict();

/**
 * Перегенерация ИИ-заключения для скрининга кандидата (батчами).
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<RegenerateScreeningAiBatchResult | { error: string }>> {
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
  screeningServerLog("admin_regenerate_screening_ai", "started", {});

  try {
    const result = await regenerateStoredScreeningAiConclusions({
      forceAll: parsedBody.forceAll === true,
      batchSize: parsedBody.batchSize,
      afterSessionId: parsedBody.afterSessionId ?? null,
      sessionIds: parsedBody.sessionIds,
    });
    screeningServerLog("admin_regenerate_screening_ai", "finished", {
      durationMs: Date.now() - started,
      updated: result.updated,
      eligible: result.eligible,
      failed: result.failed,
      hasMore: result.hasMore,
      batchEligibleProcessed: result.batchEligibleProcessed,
    });
    return NextResponse.json(result);
  } catch (err) {
    screeningServerLog("admin_regenerate_screening_ai", "failed", {
      durationMs: Date.now() - started,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json(
      { error: "Не удалось перегенерировать заключения скрининга" },
      { status: 500 }
    );
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
