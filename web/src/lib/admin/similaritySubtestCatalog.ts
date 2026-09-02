import { AUDIT_STEPS, getAuditStepByIndex } from "@/lib/audit/auditSteps";
import { REPORT_EXPORT_TEST_KIND_LABELS, type ReportExportTestKind } from "@/lib/admin/reportExportKinds";

/** Подпись субтеста для UI и выгрузок. */
export type SimilaritySubtestSpec = {
  id: string;
  label: string;
};

const SCREENING_SUBTESTS: readonly SimilaritySubtestSpec[] = [
  { id: "step1", label: "КОТ (шаг 1)" },
  { id: "step2", label: "Мотивация · Герчиков (шаг 2)" },
  { id: "step3", label: "Шкала согласия (шаг 3)" },
];

const AUDIT_STEP_LABELS: Record<number, string> = {
  1: "Тест 1 · Стили принятия решений",
  2: "Тест 2 · Целеустремлённость",
  3: "Тест 3 · Стиль исполнительской деятельности",
  4: "Тест 4 · Самоконтроль поведения",
  5: "Тест 5 · Готовность к риску",
  6: "Тест 6 · Поведенческий тип",
  7: "Тест 7 · Психологическая гибкость",
  8: "Тест 8 · Локус контроля",
  9: "Тест 9 · Толерантность",
  10: "CFIT · субтест 1",
  11: "CFIT · субтест 2",
  12: "CFIT · субтест 3",
  13: "CFIT · субтест 4",
  14: "CFIT · субтест 5",
  15: "CFIT · субтест 6",
  16: "CFIT · субтест 7",
  17: "CFIT · субтест 8",
  18: "Тест 11 · Типология Keirsey",
  19: "Тест 12 · Частота выгорания",
  20: "Тест 13 · Пары (конфликт)",
  21: "Тест 14 · Мотивация (Герчиков)",
  22: "Тест 15 · Лояльность (Likert)",
  23: "Тест 16 · Коммуникативные склонности",
  24: "Тест 17 · Эрудиция",
  25: "Тест 18 · Maslach (краткий)",
  26: "Тест 19 · Благонадёжность",
};

/**
 * Список субтестов для типа прохождения (для подписей).
 */
export function listSimilaritySubtestSpecs(testKind: ReportExportTestKind): readonly SimilaritySubtestSpec[] {
  if (testKind === "screening") {
    return SCREENING_SUBTESTS;
  }
  if (testKind === "audit_middle" || testKind === "audit_senior") {
    return AUDIT_STEPS.map((step) => ({
      id: `step:${String(step.stepIndex)}`,
      label: AUDIT_STEP_LABELS[step.stepIndex] ?? `Шаг ${String(step.stepIndex)}`,
    }));
  }
  if (testKind === "burnout") {
    return [{ id: "maslach", label: "Maslach · выгорание" }];
  }
  return [{ id: "full", label: REPORT_EXPORT_TEST_KIND_LABELS[testKind] }];
}

/**
 * Человекочитаемая подпись субтеста.
 */
export function similaritySubtestLabel(
  testKind: ReportExportTestKind,
  subtestId: string
): string {
  const spec = listSimilaritySubtestSpecs(testKind).find((item) => item.id === subtestId);
  if (spec) {
    return spec.label;
  }
  if (subtestId.startsWith("step:")) {
    const stepIndex = Number(subtestId.slice("step:".length));
    if (Number.isFinite(stepIndex)) {
      return AUDIT_STEP_LABELS[stepIndex] ?? `Шаг ${String(stepIndex)}`;
    }
  }
  const auditStep = getAuditStepByIndex(Number(subtestId.replace(/^step:/, "")));
  if (auditStep) {
    return AUDIT_STEP_LABELS[auditStep.stepIndex] ?? `Шаг ${String(auditStep.stepIndex)}`;
  }
  return subtestId;
}
