import type { AuditReportBurnoutPiAlert } from "@/lib/audit/report/auditReportTypes";
import { resolvePiExhaustionAlertRecipients } from "@/lib/admin/piExhaustionNotificationSettings";
import { sendPiExhaustionAlertEmail } from "@/lib/email/sendPiExhaustionAlertEmail";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

/**
 * Отправляет алерт HRD и администратору при критическом ПИ (если включено в настройках).
 */
export async function trySendPiExhaustionAlert(input: {
  sessionRef: string;
  personName: string;
  testLabel: string;
  burnoutPiAlert: AuditReportBurnoutPiAlert | null | undefined;
}): Promise<boolean> {
  if (!input.burnoutPiAlert?.critical) {
    return false;
  }
  if (input.burnoutPiAlert.score === null || !input.burnoutPiAlert.bandLabel) {
    return false;
  }

  const recipients = await resolvePiExhaustionAlertRecipients();
  if (recipients.length === 0) {
    screeningServerLog("email_pi_alert", "skipped_no_recipients", {
      sessionRef: input.sessionRef,
    });
    return false;
  }

  return sendPiExhaustionAlertEmail({
    to: recipients,
    personName: input.personName,
    testLabel: input.testLabel,
    piScore: input.burnoutPiAlert.score,
    piBandLabel: input.burnoutPiAlert.bandLabel,
    sessionRef: input.sessionRef,
  });
}
