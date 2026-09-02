import { NextRequest, NextResponse } from "next/server";

import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import {
  TimewebLogsError,
  fetchTimewebLogs,
  getTimewebLogsStatus,
} from "@/lib/timeweb/timewebLogsService";
import type { TimewebLogKind, TimewebLogsResponse } from "@/lib/timeweb/timewebLogsTypes";

export const dynamic = "force-dynamic";

/**
 * Прокси логов Timeweb Cloud (только главный администратор).
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<TimewebLogsResponse | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const status = getTimewebLogsStatus();
  if (!status.configured) {
    return NextResponse.json({ error: "Timeweb logs не настроены" }, { status: 503 });
  }

  const params = req.nextUrl.searchParams;
  const kindParam = params.get("kind");
  const kind: TimewebLogKind | undefined =
    kindParam === "deploy" ? "deploy" : kindParam === "runtime" ? "runtime" : undefined;

  const limitRaw = params.get("limit");
  const offsetRaw = params.get("offset");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;

  try {
    const result = await fetchTimewebLogs({
      sourceId: params.get("source") ?? undefined,
      kind,
      deployId: params.get("deploy_id"),
      search: params.get("search") ?? undefined,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TimewebLogsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Не удалось загрузить логи" }, { status: 502 });
  }
}
