import { NextRequest, NextResponse } from "next/server";

import { listCommissionEvalSaveFailureLogs } from "@/lib/commission/logCommissionEvalSaveFailure";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        items: Awaited<ReturnType<typeof listCommissionEvalSaveFailureLogs>>;
      }
    | { error: string }
  >
> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const items = await listCommissionEvalSaveFailureLogs(200);
  return NextResponse.json({ items });
}
