import { NextRequest, NextResponse } from "next/server";

import { inviteExpiresAtFrom } from "@/lib/access/inviteValidity";
import { generateAccessCode } from "@/lib/access/accessCode";
import {
  accessInviteBodySchema,
  parseInviteCandidate,
  type InviteCandidateData,
} from "@/lib/admin/parseScreeningInviteCandidate";
import { TEST_KIND_BURNOUT, testKindRequiresInviteCandidate } from "@/lib/access/testKinds";
import {
  generateRandomBatteryStepSequence,
} from "@/lib/audit/generateRandomBatteryStepSequence";
import { getAuditBatteryForTestKind } from "@/lib/audit/auditBatteries";
import { tryScheduleBurnoutReminderFromInvite } from "@/lib/burnout/tryScheduleBurnoutReminder";
import { runDueBurnoutRemindersInBackground } from "@/lib/burnout/runDueBurnoutRemindersInBackground";
import { requireAdminPanelSession, requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const MAX_GENERATE_ATTEMPTS = 8;

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        code: string;
        testKind: string;
        expiresAt: string;
        folderKey?: string;
        folderDisplayName?: string;
      }
    | { error: string }
  >
> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    screeningServerLog("admin_access_invite", "forbidden", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("admin_access_invite", "json_parse_failed", {});
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = accessInviteBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    screeningServerLog("admin_access_invite", "validation_failed", {});
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  if (parsed.data.devMode === true) {
    const fullAdmin = await requireFullAdminSession(req);
    if (!fullAdmin.ok) {
      screeningServerLog("admin_access_invite", "dev_mode_forbidden", {});
      return NextResponse.json(
        { error: "DEV-режим доступен только главному администратору" },
        { status: 403 }
      );
    }
  }

  let inviteCandidate: InviteCandidateData | null = null;
  if (testKindRequiresInviteCandidate(parsed.data.testKind)) {
    const candidateResult = await parseInviteCandidate(parsed.data);
    if (candidateResult === null) {
      inviteCandidate = null;
    } else if ("error" in candidateResult) {
      return NextResponse.json({ error: candidateResult.error }, { status: 400 });
    } else {
      inviteCandidate = candidateResult;
    }
  }

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt += 1) {
    const code = generateAccessCode();
    const createdAt = new Date();
    const expiresAt = inviteExpiresAtFrom(createdAt);
    const battery = getAuditBatteryForTestKind(parsed.data.testKind);
    const auditBatteryStepOrder =
      battery !== null ? generateRandomBatteryStepSequence(battery) : undefined;
    try {
      const row = await prisma.accessInvite.create({
        data: {
          code,
          testKind: parsed.data.testKind,
          expiresAt,
          auditBatteryStepOrder,
          devMode: parsed.data.devMode === true,
          candidateLastName: inviteCandidate?.lastName,
          candidateFirstName: inviteCandidate?.firstName,
          candidateMiddleName: inviteCandidate?.middleName,
          candidateBirthDate: inviteCandidate?.birthDate,
          candidatePositionLevel: inviteCandidate?.positionLevel,
          candidateFolderKey: inviteCandidate?.folderKey,
          interviewFolderKey: inviteCandidate?.interviewFolderKey,
        },
        select: {
          code: true,
          testKind: true,
          expiresAt: true,
          candidateFolderKey: true,
          interviewFolderKey: true,
        },
      });
      screeningServerLog("admin_access_invite", "created", {
        testKind: row.testKind,
        hasCandidate: Boolean(inviteCandidate),
        hasInterviewFolder: Boolean(inviteCandidate?.interviewFolderKey),
      });

      if (row.testKind === TEST_KIND_BURNOUT && inviteCandidate) {
        try {
          await tryScheduleBurnoutReminderFromInvite({
            firstName: inviteCandidate.firstName,
            lastName: inviteCandidate.lastName,
            candidateFolderKey: inviteCandidate.folderKey,
            inviteCode: row.code,
          });
        } catch (err) {
          screeningServerLog("admin_access_invite", "burnout_reminder_schedule_failed", {
            errorName: err instanceof Error ? err.name : "unknown",
          });
        }
        runDueBurnoutRemindersInBackground("admin_access_invite_burnout");
      }

      return NextResponse.json({
        code: row.code,
        testKind: row.testKind,
        expiresAt: row.expiresAt.toISOString(),
        ...(inviteCandidate
          ? {
              folderKey: inviteCandidate.folderKey,
              folderDisplayName: inviteCandidate.folderDisplayName,
              interviewFolderKey: inviteCandidate.interviewFolderKey ?? undefined,
              interviewFolderDisplayName: inviteCandidate.interviewFolderDisplayName ?? undefined,
            }
          : {}),
      });
    } catch {
      /* вероятный конфликт unique(code) — пробуем снова */
    }
  }

  screeningServerLog("admin_access_invite", "create_exhausted", {});
  return NextResponse.json({ error: "Не удалось сгенерировать код" }, { status: 500 });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
