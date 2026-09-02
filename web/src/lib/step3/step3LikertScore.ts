import type { LikertAnswer, Step3Data } from "@/store/useFormStore";

/**
 * Числовое значение пункта Ликерта (1 — низко, 5 — высоко).
 */
export function likertAnswerToScore(answer: LikertAnswer): number {
  switch (answer) {
    case "fully_disagree":
      return 1;
    case "disagree":
      return 2;
    case "neutral":
      return 3;
    case "agree":
      return 4;
    case "fully_agree":
      return 5;
    default:
      return 3;
  }
}

/**
 * Средний балл по 10 утверждениям шага 3 (эмоциональный фон / самооценка состояния).
 */
export function computeStep3MeanScore(data: Step3Data): number {
  const keys: (keyof Step3Data)[] = [
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q9",
    "q10",
  ];
  let sum = 0;
  let n = 0;
  for (const k of keys) {
    const v = data[k];
    if (v) {
      sum += likertAnswerToScore(v);
      n += 1;
    }
  }
  if (n === 0) {
    return 0;
  }
  return Math.round((sum / n) * 100) / 100;
}

/**
 * Краткая интерпретация среднего балла (для отчёта).
 */
export function describeStep3MeanLevel(mean: number): string {
  if (mean >= 4.2) {
    return "Высокий уровень самооценки текущего состояния и ресурсности по ответам на шкалу.";
  }
  if (mean >= 3.3) {
    return "Умеренный уровень; колебания по отдельным утверждениям возможны.";
  }
  if (mean >= 2.5) {
    return "Сниженный фон по ряду пунктов; имеет смысл обсудить контекст на очной встрече.";
  }
  return "Низкие значения по шкале; возможны выраженный стресс или истощение — осторожность при нагрузочных ролях с людьми.";
}
