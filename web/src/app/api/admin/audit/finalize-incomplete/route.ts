import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  finalizeIncompleteAuditSubmission,
  type FinalizeIncompleteAuditResult,
} from "@/lib/admin/finalizeIncompleteAuditSubmission";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z
  .object({
    confirm: z.literal(true),
    sessionId: z.string().min(8).max(200).optional(),
    assesseeKey: z.string().min(3).max(200).optional(),
    accessCode: z.string().min(8).max(80).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.sessionId || value.assesseeKey), {
    message: "sessionId или assesseeKey",
  });

/**
 * Дособирает отчёт (ИИ, PDF, email) по sync-ответам без повторного прохождения.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<FinalizeIncompleteAuditResult | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Нужны confirm:true и sessionId или assesseeKey (опционально accessCode)" },
      { status: 400 }
    );
  }

  try {
    const result = await finalizeIncompleteAuditSubmission({
      sessionId: parsed.data.sessionId,
      assesseeKey: parsed.data.assesseeKey,
      accessCode: parsed.data.accessCode,
    });
    screeningServerLog("admin_audit_finalize", "ok", {
      sessionId: result.sessionId,
      steps: result.answerStepCount,
      marked: result.inviteMarkedUsed,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось восстановить отчёт";
    screeningServerLog("admin_audit_finalize", "failed", {
      message: message.slice(0, 400),
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
