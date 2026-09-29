import { z } from "zod";

import {
  isAttestationComplete,
  type AttestationAnswers,
} from "@/lib/attestation/attestationQuestions";

const answerValueSchema = z.union([z.number().int(), z.string(), z.null()]);

const answersSchema = z
  .record(z.string(), answerValueSchema)
  .refine((record) => isAttestationComplete(record as AttestationAnswers), {
    message: "Не все блоки заполнены",
  });

export const attestationSubmitBodySchema = z
  .object({
    sessionId: z.string().min(8).max(120),
    accessCode: z.string().min(8).max(80),
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    personalDataConsent: z.literal(true),
    consentRecordedAt: z.string().datetime(),
    answers: answersSchema,
  })
  .strict();

export type AttestationSubmitBody = z.infer<typeof attestationSubmitBodySchema>;
