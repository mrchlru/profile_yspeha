import { NextRequest, NextResponse } from "next/server";

import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import {
  TimewebLogsError,
  fetchTimewebDeploys,
  getTimewebLogsStatus,
} from "@/lib/timeweb/timewebLogsService";
import type { TimewebDeploySummary } from "@/lib/timeweb/timewebLogsTypes";

export const dynamic = "force-dynamic";

type DeploysResponse = {
  deploys: TimewebDeploySummary[];
  source: string;
};

/**
 * Список деплоев приложения Timeweb (только главный администратор).
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<DeploysResponse | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const status = getTimewebLogsStatus();
  if (!status.configured) {
    return NextResponse.json({ error: "Timeweb logs не настроены" }, { status: 503 });
  }

  const source = req.nextUrl.searchParams.get("source") ?? undefined;

  try {
    const deploys = await fetchTimewebDeploys(source);
    return NextResponse.json({
      deploys,
      source: source ?? status.sources[0]?.id ?? "profile",
    });
  } catch (error) {
    if (error instanceof TimewebLogsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Не удалось загрузить деплои" }, { status: 502 });
  }
}
