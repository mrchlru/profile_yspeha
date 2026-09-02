import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { parseAuditBatteryStepOrder, testKindUsesAuditBatteryStepOrder } from "@/lib/access/auditBatteryStepOrder";
import { isTestKind } from "@/lib/access/testKinds";
import { prisma } from "@/lib/prisma";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    code: z.string().min(1).max(80),
  })
  .strict();

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        testKind: string;
        auditBatteryStepOrder?: number[];
        devMode?: boolean;
        candidateFirstName?: string;
        candidateLastName?: string;
      }
    | { error: string }
  >
> {
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    screeningServerLog("access_validate", "json_parse_failed", {});
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    screeningServerLog("access_validate", "validation_failed", {});
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const invite = await checkAccessInvite(parsed.data.code);
  if (invite.status === "expired") {
    screeningServerLog("access_validate", "code_expired", {});
    return NextResponse.json(
      {
        error:
          "Срок действия кода истёк (3 суток). Запросите у администратора новое приглашение.",
      },
      { status: 410 }
    );
  }
  if (invite.status === "used") {
    screeningServerLog("access_validate", "code_used", {});
    return NextResponse.json(
      {
        error:
          "Этот код уже был использован для прохождения тестирования и больше не действует. " +
          "Запросите у администратора новое приглашение.",
      },
      { status: 410 }
    );
  }
  if (invite.status !== "ok") {
    screeningServerLog("access_validate", "invalid_or_unknown_code", {});
    return NextResponse.json({ error: "Код не найден или недействителен" }, { status: 404 });
  }

  screeningServerLog("access_validate", "ok", { testKind: invite.testKind });

  if (isTestKind(invite.testKind) && testKindUsesAuditBatteryStepOrder(invite.testKind)) {
    const row = await prisma.accessInvite.findFirst({
      where: { code: normalizeAccessCode(parsed.data.code) },
      select: { auditBatteryStepOrder: true },
    });
    const auditBatteryStepOrder = parseAuditBatteryStepOrder(
      row?.auditBatteryStepOrder,
      invite.testKind
    );
    if (auditBatteryStepOrder === null) {
      screeningServerLog("access_validate", "missing_battery_order", {});
      return NextResponse.json(
        { error: "Код приглашения настроен некорректно. Запросите новый код у администратора." },
        { status: 500 }
      );
    }
    return NextResponse.json({
      testKind: invite.testKind,
      auditBatteryStepOrder,
      devMode: invite.devMode,
      ...(invite.candidateFirstName
        ? { candidateFirstName: invite.candidateFirstName }
        : {}),
      ...(invite.candidateLastName ? { candidateLastName: invite.candidateLastName } : {}),
    });
  }

  return NextResponse.json({
    testKind: invite.testKind,
    devMode: invite.devMode,
    ...(invite.candidateFirstName ? { candidateFirstName: invite.candidateFirstName } : {}),
    ...(invite.candidateLastName ? { candidateLastName: invite.candidateLastName } : {}),
  });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
