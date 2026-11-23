import {
  flushAuditDebouncedStepSync,
  syncAuditStepAnswersNow,
} from "@/lib/audit/syncAuditAnswersClient";
import { syncScreeningStepNow } from "@/lib/screening/syncScreeningStepClient";

export type StepTransitionSyncOptions = {
  auditStepIndex?: number;
  syncScreeningStep4?: boolean;
};

/**
 * Сохраняет шаг на сервере перед переходом; при ошибке сети бросает исключение.
 */
export async function awaitStepTransitionClientSync(
  options: StepTransitionSyncOptions
): Promise<void> {
  if (options.syncScreeningStep4 === true) {
    await syncScreeningStepNow(4);
  }
  if (options.auditStepIndex !== undefined) {
    await flushAuditDebouncedStepSync(options.auditStepIndex);
    await syncAuditStepAnswersNow(options.auditStepIndex);
  }
}