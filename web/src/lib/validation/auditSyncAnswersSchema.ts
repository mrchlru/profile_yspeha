import { z } from "zod";

import { auditStepAnswersSchema } from "@/lib/validation/auditSubmitSchema";

/** Частичная синхронизация ответов аудита после завершения шага. */
export const auditSyncAnswersBodySchema = z.object({
  sessionId: z.string().uuid(),
  accessCode: z.string().min(8).max(32),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  stepIndex: z.number().int().min(1).max(26),
  stepAnswers: auditStepAnswersSchema,
  personalDataConsent: z.boolean().optional(),
  consentRecordedAt: z.string().datetime().optional(),
});

export type AuditSyncAnswersBody = z.infer<typeof auditSyncAnswersBodySchema>;
