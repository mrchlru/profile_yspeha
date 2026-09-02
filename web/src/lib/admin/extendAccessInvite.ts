import {
  ACCESS_INVITE_VALIDITY_DAYS,
  computeExtendedInviteExpiresAt,
} from "@/lib/access/inviteValidity";
import { computeInviteStatus } from "@/lib/admin/inviteStatus";
import { prisma } from "@/lib/prisma";

export type ExtendAccessInviteResult = {
  id: string;
  code: string;
  expiresAt: Date;
  status: ReturnType<typeof computeInviteStatus>;
  extendedDays: number;
};

/**
 * Продлевает срок действия кода приглашения на стандартный период.
 */
export async function extendAccessInvite(inviteId: string): Promise<ExtendAccessInviteResult> {
  const row = await prisma.accessInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      code: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  if (!row) {
    throw new Error("Приглашение не найдено");
  }

  if (row.revokedAt) {
    throw new Error("Нельзя продлить отозванное приглашение");
  }

  if (row.usedAt) {
    throw new Error("Нельзя продлить код, по которому тест уже пройден");
  }

  const status = computeInviteStatus(row);
  if (status !== "active" && status !== "expired") {
    throw new Error("Продление доступно только для активных и истёкших кодов");
  }

  const expiresAt = computeExtendedInviteExpiresAt(row.expiresAt);
  const updated = await prisma.accessInvite.update({
    where: { id: row.id },
    data: { expiresAt },
    select: {
      id: true,
      code: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    expiresAt: updated.expiresAt,
    status: computeInviteStatus(updated),
    extendedDays: ACCESS_INVITE_VALIDITY_DAYS,
  };
}
