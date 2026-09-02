import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";

/** Обязательные блоки заключения для руководителя (ОД / ТУ). */
export type OdReserveManagerBriefConclusionPlan = {
  motivationParagraph: string | null;
  /** Фрагменты после «Основные ограничения:» (уже с пунктуацией). */
  limitationPhrases: ReadonlyArray<string>;
  managerActionSentence: string | null;
  conflictSentence: string | null;
  loadSentence: string | null;
};

/**
 * Собирает план заключения из ответов (используется правилами, ИИ и проверкой качества).
 */
export function buildOdReserveManagerBriefConclusionPlan(
  answers: AuditAnswersMap,
  builders: OdReserveManagerBriefConclusionPlanBuilders
): OdReserveManagerBriefConclusionPlan {
  return {
    motivationParagraph: builders.motivationParagraph(answers),
    limitationPhrases: builders.limitationPhrases(answers),
    managerActionSentence: builders.managerActionSentence(answers),
    conflictSentence: builders.conflictSentence(answers),
    loadSentence: builders.loadSentence(answers),
  };
}

/** Колбэки сборки плана (инжектятся из buildOdReserveManagerBriefConclusion). */
export type OdReserveManagerBriefConclusionPlanBuilders = {
  motivationParagraph: (answers: AuditAnswersMap) => string | null;
  limitationPhrases: (answers: AuditAnswersMap) => ReadonlyArray<string>;
  managerActionSentence: (answers: AuditAnswersMap) => string | null;
  conflictSentence: (answers: AuditAnswersMap) => string | null;
  loadSentence: (answers: AuditAnswersMap) => string | null;
};

/**
 * Склеивает план в текст заключения.
 */
export function renderOdReserveManagerBriefConclusionPlan(
  plan: OdReserveManagerBriefConclusionPlan
): string {
  const paragraphs: string[] = [];

  if (plan.motivationParagraph !== null && plan.motivationParagraph.trim().length > 0) {
    paragraphs.push(plan.motivationParagraph.trim());
  }

  if (plan.limitationPhrases.length > 0) {
    paragraphs.push("Основные ограничения:");
    paragraphs.push(plan.limitationPhrases.join(" "));
  }

  if (plan.managerActionSentence !== null) {
    paragraphs.push(plan.managerActionSentence);
  }

  if (plan.conflictSentence !== null) {
    paragraphs.push(plan.conflictSentence);
  }

  if (plan.loadSentence !== null) {
    paragraphs.push(plan.loadSentence);
  }

  if (paragraphs.length === 0) {
    return "Недостаточно данных для управленческого заключения.";
  }

  return paragraphs.join("\n");
}
