import { NextRequest, NextResponse } from "next/server";

import { processDueBurnoutReminders } from "@/lib/burnout/processBurnoutReminders";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

/**
 * Опциональный эндпоинт для внешнего cron (Railway, systemd timer и т.д.).
 * Без него напоминания всё равно обрабатываются при активности в админке и при событиях теста.
 * Требует переменную CRON_SECRET — без неё эндпоинт отвечает 503.
 */
export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | { ok: true; processed: number; sent: number; stopped: number; rescheduled: number; failed: number }
    | { error: string }
  >
> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    screeningServerLog("burnout_reminder_cron", "missing_secret", {});
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization")?.trim() ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    screeningServerLog("burnout_reminder_cron", "unauthorized", {});
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const result = await processDueBurnoutReminders();
  screeningServerLog("burnout_reminder_cron", "finished", {
    durationMs: Date.now() - startedAt,
    processed: result.processed,
    sent: result.sent,
    stopped: result.stopped,
    rescheduled: result.rescheduled,
    failed: result.failed,
  });

  return NextResponse.json({ ok: true, ...result });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
