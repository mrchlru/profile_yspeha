import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildCandidateDisplayName,
  matchesCandidateSearch,
} from "@/lib/admin/candidateSearch";
import {
  computeInviteStatus,
  inviteTestKindLabel,
  INVITE_STATUS_LABELS,
  parseInviteStatusFilter,
} from "@/lib/admin/inviteStatus";
import { candidatePositionLevelLabel } from "@/lib/admin/candidatePositionLevels";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.string().max(40).optional(),
});

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        items: ReadonlyArray<{
          id: string;
          code: string;
          testKind: string;
          testKindLabel: string;
          candidateDisplayName: string | null;
          positionLevelLabel: string | null;
          createdAt: string;
          expiresAt: string;
          usedAt: string | null;
          revokedAt: string | null;
          status: string;
          statusLabel: string;
        }>;
      }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsedQuery = querySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    status: req.nextUrl.searchParams.get("status") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const searchQuery = parsedQuery.data.q?.trim() ?? "";
  const statusFilter = parseInviteStatusFilter(parsedQuery.data.status);

  const rows = await prisma.accessInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      code: true,
      testKind: true,
      createdAt: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      candidateLastName: true,
      candidateFirstName: true,
      candidateMiddleName: true,
      candidateBirthDate: true,
      candidatePositionLevel: true,
    },
  });

  const items = rows
    .map((row) => {
      const status = computeInviteStatus(row);
      const candidateDisplayName =
        row.candidateLastName && row.candidateFirstName
          ? buildCandidateDisplayName({
              lastName: row.candidateLastName,
              firstName: row.candidateFirstName,
              middleName: row.candidateMiddleName,
              birthDate: row.candidateBirthDate,
            })
          : null;
      const positionLevelLabel = row.candidatePositionLevel
        ? candidatePositionLevelLabel(row.candidatePositionLevel)
        : null;
      const searchRecord = {
        code: row.code,
        lastName: row.candidateLastName,
        firstName: row.candidateFirstName,
        middleName: row.candidateMiddleName,
        birthDate: row.candidateBirthDate,
        positionLevel: row.candidatePositionLevel,
        positionLevelLabel,
        displayName: candidateDisplayName,
      };

      return {
        item: {
          id: row.id,
          code: row.code,
          testKind: row.testKind,
          testKindLabel: inviteTestKindLabel(row.testKind),
          candidateDisplayName,
          positionLevelLabel,
          createdAt: row.createdAt.toISOString(),
          expiresAt: row.expiresAt.toISOString(),
          usedAt: row.usedAt?.toISOString() ?? null,
          revokedAt: row.revokedAt?.toISOString() ?? null,
          status,
          statusLabel: INVITE_STATUS_LABELS[status],
        },
        searchRecord,
      };
    })
    .filter(({ item, searchRecord }) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      return matchesCandidateSearch(searchQuery, searchRecord);
    })
    .map(({ item }) => item);

  screeningServerLog("admin_invitations", "ok", {
    count: items.length,
    filtered: Boolean(searchQuery || statusFilter !== "all"),
  });

  return NextResponse.json({ items });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
