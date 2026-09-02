import { z } from "zod";

const sectionAnswersSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

/** Частичная синхронизация анкеты ПРОФ СБ + образование. */
export const profSbEducationSyncAnswersBodySchema = z.object({
  sessionId: z.string().trim().min(8).max(80),
  accessCode: z.string().trim().min(8).max(32),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  personalDataConsent: z.boolean().optional(),
  consentRecordedAt: z.string().datetime().optional(),
  answers: z
    .object({
      profSb: sectionAnswersSchema.optional(),
      profEducation: sectionAnswersSchema.optional(),
    })
    .strict(),
});

export type ProfSbEducationSyncAnswersBody = z.infer<typeof profSbEducationSyncAnswersBodySchema>;
