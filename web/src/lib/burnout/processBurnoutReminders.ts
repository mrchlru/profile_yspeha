import type { BurnoutReportJson } from "@/lib/burnout/burnoutReportTypes";
import {
  BURNOUT_REMINDER_STATUS_SCHEDULED,
  BURNOUT_REMINDER_STATUS_SENT,
  BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH,
  findLatestBurnoutSubmission,
  hasBurnoutInviteForFolderSince,
  scheduleBurnoutReminder,
} from "@/lib/burnout/burnoutReminderSchedule";
import {
  buildMaslachBurnoutCriticalSummary,
} from "@/lib/burnout/maslachBurnoutCritical";
import type { MaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { resolvePiExhaustionAlertRecipients } from "@/lib/admin/piExhaustionNotificationSettings";
import { burnoutRetestDueAt } from "@/lib/datetime/moscowTime";
import { sendBurnoutRetestReminderEmail } from "@/lib/email/sendBurnoutRetestReminderEmail";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";

export type ProcessBurnoutRemindersResult = {
  processed: number;
  sent: number;
  stopped: number;
  rescheduled: number;
  failed: number;
};

/**
 * Обрабатывает просроченные напоминания о повторном тесте на выгорание.
 */
export async function processDueBurnoutReminders(
  now: Date = new Date()
): Promise<ProcessBurnoutRemindersResult> {
  const dueRows = await prisma.burnoutReminderSchedule.findMany({
    where: {
      status: BURNOUT_REMINDER_STATUS_SCHEDULED,
      dueAt: { lte: now },
    },
    orderBy: { dueAt: "asc" },
    take: 50,
  });

  const result: ProcessBurnoutRemindersResult = {
    processed: 0,
    sent: 0,
    stopped: 0,
    rescheduled: 0,
    failed: 0,
  };

  for (const row of dueRows) {
    result.processed += 1;
    try {
      const handled = await _processSingleReminder(row, now);
      if (handled.sent) {
        result.sent += 1;
      }
      if (handled.stopped) {
        result.stopped += 1;
      }
      if (handled.rescheduled) {
        result.rescheduled += 1;
      }
    } catch (err) {
      result.failed += 1;
      screeningServerLog("burnout_reminder_cron", "row_failed", {
        reminderId: row.id,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  return result;
}

async function _processSingleReminder(
  row: {
    id: string;
    assesseeKey: string;
    candidateFolderKey: string | null;
    personName: string;
    triggerKind: string;
    relatedSubmissionSessionId: string | null;
  },
  now: Date
): Promise<{ sent: boolean; stopped: boolean; rescheduled: boolean }> {
  const recipients = await resolvePiExhaustionAlertRecipients();
  const latest = await findLatestBurnoutSubmission(row.assesseeKey);
  const scores = _readMaslachScores(latest?.burnoutReport);
  const criticalSummary =
    scores !== null ? buildMaslachBurnoutCriticalSummary(scores) : null;
  const isHigh = criticalSummary?.classicBurnout === true;

  const sentOk = await sendBurnoutRetestReminderEmail({
    to: recipients,
    personName: row.personName,
    triggerKind: row.triggerKind,
    maslachCritical: criticalSummary,
    sessionRef: row.id,
  });

  await prisma.burnoutReminderSchedule.update({
    where: { id: row.id },
    data: {
      status: BURNOUT_REMINDER_STATUS_SENT,
      sentAt: now,
    },
  });

  if (!sentOk) {
    screeningServerLog("burnout_reminder_cron", "email_skipped", {
      reminderId: row.id,
    });
  }

  const submissionAt = latest?.createdAt ?? null;
  const folderKey = row.candidateFolderKey;
  const hasNewInvite =
    submissionAt !== null && folderKey
      ? await hasBurnoutInviteForFolderSince(folderKey, submissionAt)
      : false;

  if (submissionAt !== null && !isHigh && !hasNewInvite) {
    screeningServerLog("burnout_reminder_cron", "chain_stopped", {
      reminderId: row.id,
      assesseeKey: row.assesseeKey,
    });
    return { sent: sentOk, stopped: true, rescheduled: false };
  }

  if (isHigh) {
    await scheduleBurnoutReminder({
      assesseeKey: row.assesseeKey,
      personName: row.personName,
      candidateFolderKey: folderKey,
      triggerKind: BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH,
      dueAt: burnoutRetestDueAt(now),
      relatedSubmissionSessionId: latest?.sessionId ?? row.relatedSubmissionSessionId,
    });
    screeningServerLog("burnout_reminder_cron", "rescheduled_high", {
      reminderId: row.id,
    });
    return { sent: sentOk, stopped: false, rescheduled: true };
  }

  if (hasNewInvite) {
    screeningServerLog("burnout_reminder_cron", "new_invite_exists", {
      reminderId: row.id,
    });
    return { sent: sentOk, stopped: false, rescheduled: false };
  }

  screeningServerLog("burnout_reminder_cron", "no_submission_stop", {
    reminderId: row.id,
  });
  return { sent: sentOk, stopped: true, rescheduled: false };
}

function _readMaslachScores(report: unknown): MaslachBurnoutScores | null {
  if (!report || typeof report !== "object") {
    return null;
  }
  const scores = (report as BurnoutReportJson).scores;
  if (!scores || typeof scores !== "object") {
    return null;
  }
  if (scores.ee === null && scores.dp === null && scores.pa === null) {
    return null;
  }
  return scores;
}
