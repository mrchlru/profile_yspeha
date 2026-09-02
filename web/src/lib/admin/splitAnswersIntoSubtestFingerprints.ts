import { flattenAnswersForCsv } from "@/lib/admin/flattenAnswersForCsv";
import type { ReportExportTestKind } from "@/lib/admin/reportExportKinds";

/**
 * Разбивает ответы на «отпечатки» по субтестам (шагам батареи).
 */
export function splitAnswersIntoSubtestFingerprints(
  testKind: ReportExportTestKind,
  answers: Record<string, unknown>
): Record<string, Record<string, string>> {
  if (testKind === "screening") {
    return {
      step1: flattenAnswersForCsv(answers.step1),
      step2: flattenAnswersForCsv(answers.step2),
      step3: flattenAnswersForCsv(answers.step3),
    };
  }

  if (testKind === "audit_middle" || testKind === "audit_senior") {
    const steps = (answers.steps ?? answers) as Record<string, unknown>;
    const out: Record<string, Record<string, string>> = {};
    for (const [stepKey, stepAnswers] of Object.entries(steps)) {
      if (stepAnswers === null || stepAnswers === undefined) {
        continue;
      }
      out[`step:${stepKey}`] = flattenAnswersForCsv(stepAnswers);
    }
    return out;
  }

  if (testKind === "burnout") {
    return {
      maslach: flattenAnswersForCsv(answers.maslach ?? answers),
    };
  }

  return {
    full: flattenAnswersForCsv(answers),
  };
}
