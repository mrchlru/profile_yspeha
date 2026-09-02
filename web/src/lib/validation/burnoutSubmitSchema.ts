import { z } from "zod";

import { MASLACH_BURNOUT_QUESTION_COUNT } from "@/lib/burnout/maslachBurnoutQuestions";

const answerValueSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const answersSchema = z
  .record(z.string(), answerValueSchema.nullable())
  .refine(
    (record) => {
      let filled = 0;
      for (let index = 1; index <= MASLACH_BURNOUT_QUESTION_COUNT; index += 1) {
        const value = record[`q${String(index)}`];
        if (typeof value === "number") {
          filled += 1;
        }
      }
      return filled === MASLACH_BURNOUT_QUESTION_COUNT;
    },
    { message: "Не все вопросы заполнены" }
  );

export const burnoutSubmitBodySchema = z
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

export type BurnoutSubmitBody = z.infer<typeof burnoutSubmitBodySchema>;
