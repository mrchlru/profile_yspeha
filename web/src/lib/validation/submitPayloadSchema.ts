import { z } from "zod";
import type { ZodTypeAny } from "zod";
import {
  AUDIT_STEP_21_QUESTIONS,
  isAuditStep21QuestionAnswered,
} from "@/lib/audit/questions/step21Gerchikov";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import {
  STEP4_MAX_CONFERENCES,
  STEP4_MAX_COURSES,
  STEP4_MAX_EDUCATION_ENTRIES,
  STEP4_MAX_LANGUAGES,
  STEP4_MAX_LITERATURE,
  STEP4_MAX_ONLINE_GAMES,
  STEP4_MAX_PREVIOUS_WORK,
  STEP4_MAX_SOCIAL_MEDIA,
  STEP4_MAX_SPECIAL_EXPERIENCE,
} from "@/lib/step4/step4Types";

const likertAnswerSchema = z.enum([
  "fully_agree",
  "agree",
  "neutral",
  "disagree",
  "fully_disagree",
]);

/** Допускаем пустую строку для заданий, не успевших до истечения 20 минут КОТ. */
const kotAnswerStringSchema = z.string().max(4000);

/** Шаг 1 — официальный КОТ (50 заданий): строковый ответ с бланка. */
export const step1DataSchema = z
  .object(
    Object.fromEntries(
      Array.from({ length: KOT_STEP_QUESTION_COUNT }, (_, i) => [
        `q${String(i + 1)}`,
        kotAnswerStringSchema,
      ])
    ) as Record<string, ZodTypeAny>
  )
  .strict();

const gerchikovAnswerValueSchema = z.union([
  z.string().max(500),
  z.array(z.string().max(80)).max(20),
  z.null(),
]);

/** Шаг 2 — опросник Герчикова (16 пунктов, как в аудите состояния). */
export const step2DataSchema = z
  .object(
    Object.fromEntries(
      AUDIT_STEP_21_QUESTIONS.map((question) => [question.id, gerchikovAnswerValueSchema])
    ) as Record<string, ZodTypeAny>
  )
  .strict()
  .superRefine((data, ctx) => {
    for (const question of AUDIT_STEP_21_QUESTIONS) {
      if (!isAuditStep21QuestionAnswered(question, data[question.id])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Шаг 2: не заполнен пункт ${question.id}`,
          path: [question.id],
        });
      }
    }
  });

export const step3DataSchema = z
  .object({
    q1: likertAnswerSchema.nullable(),
    q2: likertAnswerSchema.nullable(),
    q3: likertAnswerSchema.nullable(),
    q4: likertAnswerSchema.nullable(),
    q5: likertAnswerSchema.nullable(),
    q6: likertAnswerSchema.nullable(),
    q7: likertAnswerSchema.nullable(),
    q8: likertAnswerSchema.nullable(),
    q9: likertAnswerSchema.nullable(),
    q10: likertAnswerSchema.nullable(),
  })
  .strict();

const shortText = z.string().max(200).default("");
const mediumText = z.string().max(500).default("");
const longText = z.string().max(2000).default("");
const ynEmpty = z.enum(["", "yes", "no"]).default("");
const genderEmpty = z.enum(["", "male", "female"]).default("");

const step4PersonalSchema = z
  .object({
    lastName: shortText,
    firstName: shortText,
    middleName: shortText,
    gender: genderEmpty,
    birthDate: z.string().max(32).default(""),
    email: shortText,
    phone: shortText,
    country: shortText,
    region: shortText,
    citizenship: shortText,
    nationality: shortText,
    maritalStatus: shortText,
    address: mediumText,
    workCommute: shortText,
    travelTime: shortText,
    religiousRequirements: mediumText,
    housingOwnership: shortText,
    hasElderlyParents: ynEmpty,
    dependentsCount: shortText,
    dependentsDescription: mediumText,
    childrenCount: shortText,
    childrenBirthDates: mediumText,
    hasCriminalRecord: ynEmpty,
    badHabits: mediumText,
    currentIncome: shortText,
    desiredIncome: shortText,
    creditSalaries: shortText,
    companyCreditSalaries: shortText,
  })
  .strict();

const educationEntrySchema = z
  .object({
    yearStart: shortText,
    yearEnd: shortText,
    institution: mediumText,
    specialty: mediumText,
  })
  .strict();

const courseEntrySchema = z
  .object({
    period: shortText,
    duration: shortText,
    institutionAndCourse: mediumText,
    paidBy: shortText,
    document: shortText,
  })
  .strict();

const workPlaceSchema = z
  .object({
    organization: mediumText,
    city: shortText,
    field: shortText,
    position: mediumText,
    positionLevel: shortText,
    startDate: shortText,
    endDate: shortText,
    matchesEducation: ynEmpty,
    subordinates: shortText,
    totalEmployees: shortText,
    duties: longText,
    achievements: longText,
    leaveReason: mediumText,
  })
  .strict();

const specialExperienceSchema = z
  .object({
    direction: mediumText,
    role: shortText,
    withinProject: shortText,
    duration: shortText,
    organization: mediumText,
  })
  .strict();

const conferenceSchema = z
  .object({ name: mediumText, place: mediumText, date: shortText })
  .strict();
const literatureSchema = z
  .object({ title: mediumText, author: shortText, date: shortText })
  .strict();
const languageSchema = z
  .object({ language: shortText, level: shortText })
  .strict();
const socialMediaSchema = z
  .object({ network: shortText, identifier: mediumText })
  .strict();
const onlineGameSchema = z
  .object({ name: shortText, identifier: mediumText })
  .strict();

export const step4DataSchema = z
  .object({
    personal: step4PersonalSchema,
    educationLevel: shortText,
    additionalEducation: shortText,
    educationEntries: z
      .array(educationEntrySchema)
      .max(STEP4_MAX_EDUCATION_ENTRIES),
    courses: z.array(courseEntrySchema).max(STEP4_MAX_COURSES),
    specialExperience: z
      .array(specialExperienceSchema)
      .max(STEP4_MAX_SPECIAL_EXPERIENCE),
    conferences: z.array(conferenceSchema).max(STEP4_MAX_CONFERENCES),
    literature: z.array(literatureSchema).max(STEP4_MAX_LITERATURE),
    languages: z.array(languageSchema).max(STEP4_MAX_LANGUAGES),
    currentWork: workPlaceSchema,
    previousWork: z.array(workPlaceSchema).max(STEP4_MAX_PREVIOUS_WORK),
    socialMedia: z.array(socialMediaSchema).max(STEP4_MAX_SOCIAL_MEDIA),
    onlineGames: z.array(onlineGameSchema).max(STEP4_MAX_ONLINE_GAMES),
  })
  .strict();

const isoDateStringSchema = z
  .string()
  .min(10)
  .max(64)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "consentRecordedAt must be a valid ISO date string",
  });

/**
 * Тело POST /api/submit. Дополнительные поля запрещены (.strict()).
 */
export const submitApiBodySchema = z
  .object({
    sessionId: z.string().min(8).max(128),
    /** Нормализованный код приглашения (скрининг). */
    accessCode: z.string().min(8).max(64),
    profileName: z.string().min(1).max(200).trim(),
    personalDataConsent: z.boolean(),
    consentRecordedAt: isoDateStringSchema,
    step1Data: step1DataSchema,
    step2Data: step2DataSchema,
    step3Data: step3DataSchema,
    step4Data: step4DataSchema,
  })
  .strict();

export type SubmitApiBody = z.infer<typeof submitApiBodySchema>;
