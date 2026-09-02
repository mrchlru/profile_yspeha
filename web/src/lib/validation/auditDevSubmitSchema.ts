import { z } from "zod";

import { auditAnswersMapSchema } from "@/lib/validation/auditSubmitSchema";

/**
 * Схема payload для `POST /api/audit/dev-submit`.
 * Допускает частичные ответы (один или несколько шагов) — для техтеста.
 */
export const auditDevSubmitBodySchema = z
  .object({
    accessCode: z.string().min(1).max(80),
    sessionId: z.string().min(1).max(200),
    firstName: z.string().max(200).optional(),
    lastName: z.string().max(200).optional(),
    personalDataConsent: z.literal(true),
    consentRecordedAt: z.string().datetime(),
    answers: auditAnswersMapSchema.refine(
      (value) => Object.keys(value).length >= 1,
      { message: "Нужен хотя бы один шаг с ответами" }
    ),
  })
  .strict();

export type AuditDevSubmitBody = z.infer<typeof auditDevSubmitBodySchema>;
