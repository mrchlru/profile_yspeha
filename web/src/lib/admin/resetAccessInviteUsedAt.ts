import { normalizeAccessCode } from "@/lib/access/accessCode";
import { findAuditSessionIdForAccessInvite } from "@/lib/admin/findAuditSessionIdForAccessInvite";
import { computeInviteStatus, INVITE_STATUS_LABELS } from "@/lib/admin/inviteStatus";
import { prisma } from "@/lib/prisma";

export type ResetAccessInviteUsedAtResult = {
  id: string;
  code: string;
  status: ReturnType<typeof computeInviteStatus>;
  statusLabel: string;
  hadUsedAt: boolean;
};

/**
 * Снимает ошибочную отметку «Пройден», если тест не завершён на сервере.
 */
export async function resetAccessInviteUsedAt(input: {
  inviteId?: string;
  accessCode?: string;
}): Promise<ResetAccessInviteUsedAtResult> {
  const invite = await _loadInvite(input);
  if (invite.usedAt === null) {
    const status = computeInviteStatus(invite);
    return {
      id: invite.id,
      code: invite.code,
      status,
      statusLabel: INVITE_STATUS_LABELS[status],
      hadUsedAt: false,
    };
  }

  const screening = await prisma.screeningSubmission.findFirst({
    where: { accessInviteCode: invite.code },
    select: { id: true },
  });
  if (screening !== null) {
    throw new Error(
      "Нельзя сбросить статус: по коду есть сохранённая анкета скрининга (возможен отчёт КОТ)"
    );
  }

  const auditSessionId = await findAuditSessionIdForAccessInvite(invite.code);
  if (auditSessionId !== null) {
    const audit = await prisma.auditSubmission.findUnique({
      where: { sessionId: auditSessionId },
      select: { auditReport: true },
    });
    if (audit?.auditReport !== null && audit?.auditReport !== undefined) {
      throw new Error(
        "Нельзя сбросить статус: по коду уже есть готовый отчёт по батарее"
      );
    }
  }

  const updated = await prisma.accessInvite.update({
    where: { id: invite.id },
    data: { usedAt: null },
    select: {
      id: true,
      code: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      startedAt: true,
    },
  });

  const status = computeInviteStatus(updated);
  return {
    id: updated.id,
    code: updated.code,
    status,
    statusLabel: INVITE_STATUS_LABELS[status],
    hadUsedAt: true,
  };
}

async function _loadInvite(input: {
  inviteId?: string;
  accessCode?: string;
}): Promise<{
  id: string;
  code: string;
  usedAt: Date | null;
  revokedAt: Date | null;
  startedAt: Date | null;
  expiresAt: Date;
}> {
  if (input.inviteId) {
    const row = await prisma.accessInvite.findUnique({
      where: { id: input.inviteId },
      select: {
        id: true,
        code: true,
        usedAt: true,
        revokedAt: true,
        startedAt: true,
        expiresAt: true,
      },
    });
    if (row === null) {
      throw new Error("Приглашение не найдено");
    }
    return row;
  }
  const code = normalizeAccessCode(input.accessCode ?? "");
  if (code.length < 8) {
    throw new Error("Укажите inviteId или accessCode");
  }
  const row = await prisma.accessInvite.findFirst({
    where: { code },
    select: {
      id: true,
      code: true,
      usedAt: true,
      revokedAt: true,
      startedAt: true,
      expiresAt: true,
    },
  });
  if (row === null) {
    throw new Error("Приглашение не найдено");
  }
  return row;
}