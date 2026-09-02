import { z } from "zod";

/** Частичная синхронизация шага скрининга (step-1…4). */
export const screeningSyncAnswersBodySchema = z.object({
  sessionId: z.string().min(8).max(128),
  accessCode: z.string().min(8).max(64),
  profileName: z.string().min(1).max(200).trim(),
  personalDataConsent: z.boolean().optional(),
  consentRecordedAt: z.string().datetime().optional(),
  step: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  stepData: z.record(z.string(), z.unknown()),
});

export type ScreeningSyncAnswersBody = z.infer<typeof screeningSyncAnswersBodySchema>;
