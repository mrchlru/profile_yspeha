import { loadStep4DataForAuditSession } from "@/lib/admin/rebuildAuditSubmissionReport";
import { prisma } from "@/lib/prisma";
import type { Step4Data } from "@/lib/step4/step4Types";
import { isStep4Complete } from "@/lib/validation/stepCompletion";

/**
 * Подставляет step4 из БД, если в теле submit анкеты ПРОФ СБ нет.
 */
export async function resolveStep4DataForAuditSubmit(
  sessionId: string,
  clientStep4: Step4Data | undefined
): Promise<Step4Data | undefined> {
  if (clientStep4 !== undefined && isStep4Complete(clientStep4)) {
    return clientStep4;
  }

  const screeningRow = await prisma.screeningSubmission.findUnique({
    where: { sessionId },
    select: { step4Data: true },
  });
  if (
    screeningRow?.step4Data !== null &&
    screeningRow?.step4Data !== undefined &&
    typeof screeningRow.step4Data === "object"
  ) {
    const fromScreening = screeningRow.step4Data as Step4Data;
    if (isStep4Complete(fromScreening)) {
      return fromScreening;
    }
  }

  const fromProfSb = await loadStep4DataForAuditSession(sessionId);
  if (fromProfSb !== undefined && isStep4Complete(fromProfSb)) {
    return fromProfSb;
  }

  return clientStep4;
}