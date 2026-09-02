import { NextRequest, NextResponse } from "next/server";

import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import {
  runOpenAiConnectionTest,
  type OpenAiConnectionTestResult,
} from "@/lib/ai/runOpenAiConnectionTest";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

/**
 * Проверка связи с OpenAI (только главный администратор).
 * Минимальный Chat Completions-запрос через OPENAI_BASE_URL / relay.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<OpenAiConnectionTestResult | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runOpenAiConnectionTest();
  screeningServerLog("admin_openai_test", result.ok ? "ok" : "failed", {
    model: result.env.model,
    hasBaseUrl: result.env.hasBaseUrl,
    hasRelaySecret: result.env.hasRelaySecret,
    httpStatus: result.httpStatus,
    durationMs: result.durationMs,
    hint: result.hint,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
