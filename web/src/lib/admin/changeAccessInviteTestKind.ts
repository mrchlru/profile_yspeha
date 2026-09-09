import { Prisma } from "@/generated/prisma/client";

import { isTestKind, type TestKind } from "@/lib/access/testKinds";
import { listChangeableInviteTestKinds } from "@/lib/admin/adminTestCatalog";
import { inviteCanChangeTestKind, inviteTestKindLabel } from "@/lib/admin/inviteStatus";
import { getAuditBatteryForTestKind } from "@/lib/audit/auditBatteries";
import { generateRandomBatteryStepSequence } from "@/lib/audit/generateRandomBatteryStepSequence";
import { prisma } from "@/lib/prisma";

export type ChangeAccessInviteTestKindResult = {
  id: string;
  code: string;
  testKind: TestKind;
  testKindLabel: string;
};

/**
 * Меняет тип теста у приглашения, пока прохождение ещё не начато.
 */
export async function changeAccessInviteTestKind(
  inviteId: string,
  nextTestKind: string
): Promise<ChangeAccessInviteTestKindResult> {
  if (!isTestKind(nextTestKind) || !listChangeableInviteTestKinds().includes(nextTestKind)) {
    throw new Error("Некорректный тип теста");
  }

  const row = await prisma.accessInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      code: true,
      testKind: true,
      startedAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  if (!row) {
    throw new Error("Приглашение не найдено");
  }

  if (!inviteCanChangeTestKind(row)) {
    throw new Error(
      "Тип теста нельзя изменить: приглашение уже начали проходить, прошли или отозвали"
    );
  }

  if (row.testKind === nextTestKind) {
    return {
      id: row.id,
      code: row.code,
      testKind: nextTestKind,
      testKindLabel: inviteTestKindLabel(nextTestKind),
    };
  }

  const battery = getAuditBatteryForTestKind(nextTestKind);
  const auditBatteryStepOrder =
    battery !== null ? generateRandomBatteryStepSequence(battery) : Prisma.DbNull;

  const updated = await prisma.accessInvite.update({
    where: { id: row.id },
    data: {
      testKind: nextTestKind,
      auditBatteryStepOrder,
    },
    select: {
      id: true,
      code: true,
      testKind: true,
    },
  });

  if (!isTestKind(updated.testKind)) {
    throw new Error("Некорректный тип теста после обновления");
  }

  return {
    id: updated.id,
    code: updated.code,
    testKind: updated.testKind,
    testKindLabel: inviteTestKindLabel(updated.testKind),
  };
}
