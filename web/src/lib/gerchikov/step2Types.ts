import type { AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { AUDIT_STEP_21_QUESTIONS } from "@/lib/audit/questions/step21Gerchikov";

/** Одно поле ответа шага 2 скрининга (идентично аудиту, шаг 19). */
export type GerchikovStep2AnswerValue = string | ReadonlyArray<string> | null;

/**
 * Ответы опросника Герчикова в скрининге — тот же формат, что в аудите состояния.
 */
export type GerchikovStep2Data = Record<string, GerchikovStep2AnswerValue>;

/** Число пунктов теста Герчикова в скрининге (как в аудите). */
export const GERCHIKOV_SCREENING_QUESTION_COUNT = AUDIT_STEP_21_QUESTIONS.length;

/** Пустые ответы q1–q16 для новой сессии скрининга. */
export function createEmptyGerchikovStep2Data(): GerchikovStep2Data {
  const data: GerchikovStep2Data = {};
  for (const question of AUDIT_STEP_21_QUESTIONS) {
    data[question.id] = null;
  }
  return data;
}

/** Приводит step2 скрининга к формату ответов шага аудита для скоринга. */
export function gerchikovStep2ToAuditAnswers(data: GerchikovStep2Data): AuditStepAnswers {
  return data as AuditStepAnswers;
}
