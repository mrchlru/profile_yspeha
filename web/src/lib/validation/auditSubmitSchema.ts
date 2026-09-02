import { z } from "zod";

import { step4DataSchema } from "@/lib/validation/submitPayloadSchema";

/**
 * Схема payload для `POST /api/audit/submit`.
 *
 * Намеренно лёгкая: основная нагрузка — `answers`, чьё содержимое
 * соответствует `AuditAnswersMap`. Конкретные шкалы и валидация значений
 * по каждому шагу проверяются на клиенте; здесь — структурные ограничения,
 * чтобы исключить очевидно поломанный запрос и не упереться в JSON-лимит
 * Postgres (16 МБ по умолчанию).
 *
 * Длины строк ограничены сознательно завышенно — пользователь может ввести
 * длинную фамилию или составное имя, но 200 символов хватит.
 */

/** Один ответ: строка/число/массив строк/null (см. AuditAnswerEntry). */
export const auditAnswerEntrySchema = z.union([
  z.string().max(2000),
  z.number().finite(),
  z.array(z.string().max(2000)).max(200),
  z.null(),
]);

/** Ответы одного шага: q1..qN. */
export const auditStepAnswersSchema = z.record(z.string().min(1).max(40), auditAnswerEntrySchema);

/** Карта ответов по шагам: ключ — номер шага в виде строки. */
export const auditAnswersMapSchema = z.record(
  z.string().regex(/^[1-9][0-9]?$/),
  auditStepAnswersSchema
);

const profSbAnswersSchema = z
  .object({
    profSb: z.record(z.string(), auditAnswerEntrySchema),
    profEducation: z.record(z.string(), auditAnswerEntrySchema).optional(),
  })
  .strict();

export const auditSubmitBodySchema = z
  .object({
    accessCode: z.string().min(1).max(80),
    sessionId: z.string().min(1).max(200),
    firstName: z.string().min(1).max(200),
    lastName: z.string().min(1).max(200),
    personalDataConsent: z.literal(true),
    consentRecordedAt: z.string().datetime(),
    answers: auditAnswersMapSchema,
    /** Анкета ПРОФ СБ из скрининга (step-4) для батареи ТУ / упров / шефов. */
    step4Data: step4DataSchema.optional(),
    profSbAnswers: profSbAnswersSchema.optional(),
  })
  .strict();

export type AuditSubmitBody = z.infer<typeof auditSubmitBodySchema>;
