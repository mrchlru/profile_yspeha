import { z } from "zod";

import {
  SPECIALIST_SCREENING_QUESTION_COUNT,
  SPECIALIST_SCREENING_QUESTIONS,
} from "@/lib/specialistScreening/specialistScreeningQuestions";

const answerValueSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const answersSchema = z
  .record(z.string(), answerValueSchema.nullable())
  .refine(
    (record) => {
      let filled = 0;
      for (const question of SPECIALIST_SCREENING_QUESTIONS) {
        const value = record[question.id];
        if (typeof value !== "number") {
          continue;
        }
        const max = question.scale === "asrs" ? 4 : 3;
        if (value < 0 || value > max) {
          return false;
        }
        filled += 1;
      }
      return filled === SPECIALIST_SCREENING_QUESTION_COUNT;
    },
    { message: "Не все вопросы заполнены" }
  );

export const specialistScreeningSubmitBodySchema = z
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

export type SpecialistScreeningSubmitBody = z.infer<
  typeof specialistScreeningSubmitBodySchema
>;
