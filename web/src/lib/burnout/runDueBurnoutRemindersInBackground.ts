import { processDueBurnoutReminders } from "@/lib/burnout/processBurnoutReminders";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

/**
 * Проверяет просроченные напоминания о повторном тесте на выгорание.
 * Не блокирует основной запрос: ошибки логируются, но не пробрасываются.
 *
 * Используется как запасной механизм без внешнего cron — срабатывает при
 * активности в админке или при событиях теста на выгорание.
 */
export function runDueBurnoutRemindersInBackground(reason: string): void {
  void processDueBurnoutReminders()
    .then((result) => {
      if (result.processed > 0) {
        screeningServerLog("burnout_reminder_lazy", "processed", {
          reason,
          processed: result.processed,
          sent: result.sent,
          stopped: result.stopped,
          rescheduled: result.rescheduled,
          failed: result.failed,
        });
      }
    })
    .catch((err) => {
      screeningServerLog("burnout_reminder_lazy", "failed", {
        reason,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    });
}
