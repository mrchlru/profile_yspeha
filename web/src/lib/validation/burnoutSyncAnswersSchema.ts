import { z } from "zod";

const burnoutAnswerValueSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.null(),
]);

/** Частичная синхронизация ответов теста на выгорание. */
export const burnoutSyncAnswersBodySchema = z.object({
  sessionId: z.string().min(8).max(120),
  accessCode: z.string().min(8).max(80),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  personalDataConsent: z.boolean().optional(),
  consentRecordedAt: z.string().datetime().optional(),
  answers: z.record(z.string(), burnoutAnswerValueSchema),
});

export type BurnoutSyncAnswersBody = z.infer<typeof burnoutSyncAnswersBodySchema>;
