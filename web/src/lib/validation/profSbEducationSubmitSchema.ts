import { z } from "zod";

const sectionAnswersSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export const profSbEducationSubmitBodySchema = z
  .object({
    sessionId: z.string().trim().min(8).max(80),
    accessCode: z.string().trim().min(8).max(32),
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    personalDataConsent: z.literal(true),
    consentRecordedAt: z.string().datetime(),
    answers: z
      .object({
        profSb: sectionAnswersSchema,
        profEducation: sectionAnswersSchema,
      })
      .strict(),
  })
  .strict();
