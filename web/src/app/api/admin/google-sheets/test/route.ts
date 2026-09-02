import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { runGoogleSheetsConnectionTest } from "@/lib/googleSheets/runGoogleSheetsConnectionTest";
import type { GoogleSheetsConnectionTestResult } from "@/lib/googleSheets/runGoogleSheetsConnectionTest";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    writeTestRow: z.boolean().optional(),
  })
  .strict();

/**
 * Проверка Google Sheets на проде (только главный администратор).
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<GoogleSheetsConnectionTestResult | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let writeTestRow = false;
  try {
    const jsonBody = await req.json();
    const parsed = bodySchema.safeParse(jsonBody);
    if (parsed.success) {
      writeTestRow = parsed.data.writeTestRow === true;
    }
  } catch {
    writeTestRow = false;
  }

  const result = await runGoogleSheetsConnectionTest({ writeTestRow });
  screeningServerLog("admin_google_sheets_test", result.ok ? "ok" : "failed", {
    writeTestRow,
    hasSpreadsheetId: result.env.hasSpreadsheetId,
    hasServiceAccountJson: result.env.hasServiceAccountJson,
    testRowWritten: result.testRowWritten,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<GoogleSheetsConnectionTestResult | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runGoogleSheetsConnectionTest({ writeTestRow: false });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
