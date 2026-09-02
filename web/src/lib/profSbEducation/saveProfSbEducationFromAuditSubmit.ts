import { Prisma } from "@/generated/prisma/client";

import { normalizeAccessCode } from "@/lib/access/accessCode";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import type { ProfSbEducationSectionId } from "@/lib/profSbEducation/profSbEducationTypes";
import { buildStep4AiSummary } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";
import { prisma } from "@/lib/prisma";
import type { AuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";

type SaveProfSbFromAuditArgs = {
  sessionId: string;
  accessCode: string;
  assessee: AuditAssesseeKey;
  consentRecordedAt: Date;
  step4Data: Step4Data;
  candidateFolderKey: string | null;
};

/**
 * Сохраняет анкету ПРОФ СБ (step-4 скрининга) вместе с финальной отправкой аудита.
 */
export async function saveProfSbEducationFromAuditSubmit(
  args: SaveProfSbFromAuditArgs
): Promise<void> {
  const summary = buildStep4AiSummary(args.step4Data);
  const profReport = {
    status: "computed" as const,
    sections: ["profSb"] as ReadonlyArray<ProfSbEducationSectionId>,
    computedAt: formatMoscowNow(),
    interpretation: summary.length > 0 ? summary.slice(0, 12000) : null,
  };
  const answers = {
    source: "screening_step4",
    step4Data: args.step4Data,
  };

  await prisma.profSbEducationSubmission.upsert({
    where: { sessionId: args.sessionId },
    create: {
      sessionId: args.sessionId,
      assesseeKey: args.assessee.key,
      assesseeKeyVer: args.assessee.version,
      firstName: args.assessee.firstNameDisplay,
      lastName: args.assessee.lastNameDisplay,
      personalDataConsent: true,
      consentRecordedAt: args.consentRecordedAt,
      answers: answers as unknown as Prisma.InputJsonValue,
      profReport: profReport as unknown as Prisma.InputJsonValue,
      accessInviteCode: normalizeAccessCode(args.accessCode),
      candidateFolderKey: args.candidateFolderKey,
    },
    update: {
      assesseeKey: args.assessee.key,
      assesseeKeyVer: args.assessee.version,
      firstName: args.assessee.firstNameDisplay,
      lastName: args.assessee.lastNameDisplay,
      personalDataConsent: true,
      consentRecordedAt: args.consentRecordedAt,
      answers: answers as unknown as Prisma.InputJsonValue,
      profReport: profReport as unknown as Prisma.InputJsonValue,
      accessInviteCode: normalizeAccessCode(args.accessCode),
      candidateFolderKey: args.candidateFolderKey,
    },
  });
}
