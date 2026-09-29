import { z } from "zod";

const attestationAnswerValueSchema = z.union([
  z.number().int(),
  z.string(),
  z.null(),
]);

/** Частичная синхронизация ответов аттестации. */
export const attestationSyncAnswersBodySchema = z.object({
  sessionId: z.string().min(8).max(120),
  accessCode: z.string().min(8).max(80),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  personalDataConsent: z.boolean().optional(),
  consentRecordedAt: z.string().datetime().optional(),
  answers: z.record(z.string(), attestationAnswerValueSchema),
});

export type AttestationSyncAnswersBody = z.infer<typeof attestationSyncAnswersBodySchema>;
