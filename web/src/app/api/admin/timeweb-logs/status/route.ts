import { NextRequest, NextResponse } from "next/server";

import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { getTimewebLogsStatus } from "@/lib/timeweb/timewebLogsService";
import type { TimewebLogsStatus } from "@/lib/timeweb/timewebLogsTypes";

export const dynamic = "force-dynamic";

/**
 * Статус интеграции Timeweb logs (только главный администратор).
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<TimewebLogsStatus | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(getTimewebLogsStatus());
}
