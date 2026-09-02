import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import {
  BURNOUT_REMINDER_TRIGGER_INVITE,
  BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH,
  BURNOUT_REMINDER_TRIGGER_SUBMISSION_OK,
  scheduleBurnoutReminder,
} from "@/lib/burnout/burnoutReminderSchedule";
import {
  buildMaslachBurnoutCriticalSummary,
} from "@/lib/burnout/maslachBurnoutCritical";
import { isClassicMaslachBurnout } from "@/lib/burnout/maslachBurnoutInterpretation";
import type { MaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import { burnoutRetestDueAt } from "@/lib/datetime/moscowTime";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type BurnoutInviteReminderInput = {
  firstName: string;
  lastName: string;
  candidateFolderKey?: string | null;
  inviteCode: string;
};

/**
 * Планирует напоминание о повторном тесте через 3 месяца после создания приглашения.
 */
export async function tryScheduleBurnoutReminderFromInvite(
  input: BurnoutInviteReminderInput
): Promise<boolean> {
  const assessee = buildAuditAssesseeKey({
    firstName: input.firstName,
    lastName: input.lastName,
  });
  if (assessee === null) {
    return false;
  }

  const personName = `${assessee.lastNameDisplay} ${assessee.firstNameDisplay}`;
  const reminderId = await scheduleBurnoutReminder({
    assesseeKey: assessee.key,
    personName,
    candidateFolderKey: input.candidateFolderKey ?? null,
    triggerKind: BURNOUT_REMINDER_TRIGGER_INVITE,
    dueAt: burnoutRetestDueAt(),
    relatedInviteCode: input.inviteCode,
  });

  screeningServerLog("burnout_reminder", "scheduled_from_invite", {
    reminderId,
    assesseeKey: assessee.key,
  });
  return true;
}

export type BurnoutSubmissionReminderInput = {
  assesseeKey: string;
  personName: string;
  candidateFolderKey?: string | null;
  sessionId: string;
  scores: MaslachBurnoutScores;
};

/**
 * После прохождения теста Маслач планирует напоминание через 3 месяца
 * (или продолжает цепочку при высоких показателях).
 */
export async function tryScheduleBurnoutReminderFromSubmission(
  input: BurnoutSubmissionReminderInput
): Promise<boolean> {
  const critical = isClassicMaslachBurnout(input.scores);
  const summary = buildMaslachBurnoutCriticalSummary(input.scores);

  const reminderId = await scheduleBurnoutReminder({
    assesseeKey: input.assesseeKey,
    personName: input.personName,
    candidateFolderKey: input.candidateFolderKey ?? null,
    triggerKind: critical
      ? BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH
      : BURNOUT_REMINDER_TRIGGER_SUBMISSION_OK,
    dueAt: burnoutRetestDueAt(),
    relatedSubmissionSessionId: input.sessionId,
  });

  screeningServerLog("burnout_reminder", "scheduled_from_submission", {
    reminderId,
    assesseeKey: input.assesseeKey,
    critical: summary.classicBurnout,
  });
  return true;
}
