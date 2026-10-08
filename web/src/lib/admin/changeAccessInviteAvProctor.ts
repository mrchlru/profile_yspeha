import { prisma } from "@/lib/prisma";
import { inviteCanChangeAvProctor } from "@/lib/admin/inviteStatus";

export type ChangeAccessInviteAvProctorResult = {
  id: string;
  code: string;
  avProctorDisabled: boolean;
};

/**
 * Включает или отключает камеру/микрофон прокторинга на приглашении.
 */
export async function changeAccessInviteAvProctor(
  inviteId: string,
  avProctorDisabled: boolean
): Promise<ChangeAccessInviteAvProctorResult> {
  const row = await prisma.accessInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      code: true,
      usedAt: true,
      revokedAt: true,
      avProctorDisabled: true,
    },
  });

  if (!row) {
    throw new Error("Приглашение не найдено");
  }

  if (!inviteCanChangeAvProctor(row)) {
    throw new Error("Нельзя изменить режим прокторинга: код уже использован или отозван");
  }

  if (row.avProctorDisabled === avProctorDisabled) {
    return {
      id: row.id,
      code: row.code,
      avProctorDisabled: row.avProctorDisabled,
    };
  }

  const updated = await prisma.accessInvite.update({
    where: { id: row.id },
    data: { avProctorDisabled },
    select: { id: true, code: true, avProctorDisabled: true },
  });

  return updated;
}
