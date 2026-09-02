import { NextRequest, NextResponse } from "next/server";

import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        items: ReadonlyArray<{
          sessionId: string;
          createdAt: string;
          firstName: string;
          lastName: string;
          assesseeKey: string;
          hasAuditReport: boolean;
        }>;
      }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    screeningServerLog("admin_audit_submissions", "forbidden", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rows = await prisma.auditSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      sessionId: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      assesseeKey: true,
      auditReport: true,
    },
  });

  screeningServerLog("admin_audit_submissions", "ok", { count: rows.length });

  return NextResponse.json({
    items: rows.map((r) => ({
      sessionId: r.sessionId,
      createdAt: r.createdAt.toISOString(),
      firstName: r.firstName,
      lastName: r.lastName,
      assesseeKey: r.assesseeKey,
      hasAuditReport: r.auditReport !== null,
    })),
  });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
