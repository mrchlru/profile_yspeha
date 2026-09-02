import { burnoutRetestDueAt } from "@/lib/datetime/moscowTime";
import { prisma } from "@/lib/prisma";

export const BURNOUT_REMINDER_STATUS_SCHEDULED = "scheduled" as const;
export const BURNOUT_REMINDER_STATUS_SENT = "sent" as const;
export const BURNOUT_REMINDER_STATUS_CANCELLED = "cancelled" as const;

export type BurnoutReminderStatus =
  | typeof BURNOUT_REMINDER_STATUS_SCHEDULED
  | typeof BURNOUT_REMINDER_STATUS_SENT
  | typeof BURNOUT_REMINDER_STATUS_CANCELLED;

export const BURNOUT_REMINDER_TRIGGER_INVITE = "invite_created" as const;
export const BURNOUT_REMINDER_TRIGGER_SUBMISSION_OK = "submission_ok" as const;
export const BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH = "submission_high" as const;

export type BurnoutReminderTriggerKind =
  | typeof BURNOUT_REMINDER_TRIGGER_INVITE
  | typeof BURNOUT_REMINDER_TRIGGER_SUBMISSION_OK
  | typeof BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH;

export type ScheduleBurnoutReminderInput = {
  assesseeKey: string;
  personName: string;
  candidateFolderKey?: string | null;
  triggerKind: BurnoutReminderTriggerKind;
  dueAt?: Date;
  relatedInviteCode?: string | null;
  relatedSubmissionSessionId?: string | null;
};

/**
 * Отменяет все ожидающие напоминания по сотруднику.
 */
export async function cancelPendingBurnoutReminders(
  assesseeKey: string,
  reason: string
): Promise<number> {
  const result = await prisma.burnoutReminderSchedule.updateMany({
    where: {
      assesseeKey,
      status: BURNOUT_REMINDER_STATUS_SCHEDULED,
    },
    data: {
      status: BURNOUT_REMINDER_STATUS_CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });
  return result.count;
}

/**
 * Планирует напоминание о повторном тесте: отменяет предыдущие `scheduled` и создаёт новую запись.
 */
export async function scheduleBurnoutReminder(
  input: ScheduleBurnoutReminderInput
): Promise<string> {
  await cancelPendingBurnoutReminders(
    input.assesseeKey,
    `replaced_by_${input.triggerKind}`
  );

  const row = await prisma.burnoutReminderSchedule.create({
    data: {
      assesseeKey: input.assesseeKey,
      candidateFolderKey: input.candidateFolderKey ?? null,
      personName: input.personName.trim(),
      dueAt: input.dueAt ?? burnoutRetestDueAt(),
      status: BURNOUT_REMINDER_STATUS_SCHEDULED,
      triggerKind: input.triggerKind,
      relatedInviteCode: input.relatedInviteCode ?? null,
      relatedSubmissionSessionId: input.relatedSubmissionSessionId ?? null,
    },
    select: { id: true },
  });

  return row.id;
}

/**
 * Возвращает последнее прохождение теста Маслач по ключу сотрудника.
 */
export async function findLatestBurnoutSubmission(assesseeKey: string): Promise<{
  sessionId: string;
  createdAt: Date;
  burnoutReport: unknown;
} | null> {
  const row = await prisma.burnoutSubmission.findFirst({
    where: { assesseeKey },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      createdAt: true,
      burnoutReport: true,
    },
  });
  return row;
}

/**
 * Проверяет, создавалось ли приглашение на тест выгорания для папки после указанной даты.
 */
export async function hasBurnoutInviteForFolderSince(
  candidateFolderKey: string,
  since: Date
): Promise<boolean> {
  const count = await prisma.accessInvite.count({
    where: {
      testKind: "burnout",
      candidateFolderKey,
      createdAt: { gt: since },
    },
  });
  return count > 0;
}
