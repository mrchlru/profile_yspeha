import { prisma } from "@/lib/prisma";

export type DeleteAccessInviteResult = {
  id: string;
  code: string;
};

/**
 * Удаляет запись приглашения (любой статус, в том числе старые и использованные).
 */
export async function deleteAccessInvite(inviteId: string): Promise<DeleteAccessInviteResult> {
  const row = await prisma.accessInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, code: true },
  });

  if (!row) {
    throw new Error("Приглашение не найдено");
  }

  await prisma.accessInvite.delete({ where: { id: row.id } });

  return { id: row.id, code: row.code };
}
