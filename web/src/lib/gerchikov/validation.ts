import {
  AUDIT_STEP_21_QUESTIONS,
  countAuditStep21Answered,
  isAuditStep21QuestionAnswered,
} from "@/lib/audit/questions/step21Gerchikov";
import type { GerchikovStep2Data } from "@/lib/gerchikov/step2Types";

/** Все 16 пунктов Герчикова заполнены по правилам аудита. */
export function isGerchikovStep2Complete(data: GerchikovStep2Data): boolean {
  return (
    countAuditStep21Answered(AUDIT_STEP_21_QUESTIONS, data) >= AUDIT_STEP_21_QUESTIONS.length
  );
}

/** Число корректно заполненных пунктов (для прогресс-бара). */
export function getGerchikovStep2AnsweredCount(data: GerchikovStep2Data): number {
  return countAuditStep21Answered(AUDIT_STEP_21_QUESTIONS, data);
}

/** Проверяет один пункт (для тестов и отладки). */
export function isGerchikovStep2QuestionAnswered(
  questionId: string,
  rawValue: unknown
): boolean {
  const question = AUDIT_STEP_21_QUESTIONS.find((q) => q.id === questionId);
  if (question === undefined) {
    return false;
  }
  return isAuditStep21QuestionAnswered(question, rawValue);
}
