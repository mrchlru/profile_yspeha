import {
  computeStep3MeanScore,
  describeStep3MeanLevel,
  likertAnswerToScore,
} from "@/lib/step3/step3LikertScore";
import type { LikertAnswer, Step3Data } from "@/store/useFormStore";

/** Тексты утверждений шкалы Ликерта (шаг 3) — синхронно с UI `step-3/page.tsx`. */
const STEP3_QUESTION_TEXTS: ReadonlyArray<{ key: keyof Step3Data; text: string }> = [
  { key: "q1", text: "Я обычно сохраняю позитивный настрой на работе." },
  { key: "q2", text: "Мне легко адаптироваться к изменениям." },
  { key: "q3", text: "Я спокойно отношусь к критике и улучшениям." },
  { key: "q4", text: "Я способен(на) поддерживать фокус на задачах." },
  { key: "q5", text: "Я умею восстанавливаться после стресса." },
  { key: "q6", text: "Я проявляю эмпатию к людям вокруг." },
  { key: "q7", text: "Я стремлюсь к ясности и понимаю приоритеты." },
  { key: "q8", text: "Я чувствую контроль над тем, что происходит." },
  { key: "q9", text: "Мне комфортно работать в команде." },
  { key: "q10", text: "Я избегаю конфликтов и умею их разруливать." },
];

function likertAnswerRuShort(answer: LikertAnswer | null | undefined): string {
  if (!answer) {
    return "—";
  }
  switch (answer) {
    case "fully_agree":
      return "полностью согласен";
    case "agree":
      return "согласен";
    case "neutral":
      return "нейтрально";
    case "disagree":
      return "скорее не согласен";
    case "fully_disagree":
      return "полностью не согласен";
    default:
      return String(answer);
  }
}

/**
 * Формирует развёрнутый текст по шкале Ликерта (шаг 3) для передачи в LLM.
 */
export function buildStep3LikertBlockForAi(data: Step3Data): string {
  const mean = computeStep3MeanScore(data);
  const lines: string[] = [
    "Методика: шкала Ликерта (10 утверждений, баллы 1–5 по каждому пункту).",
    `Средний_балл: ${String(mean)} (из диапазона 1–5).`,
    `Интерпретация_среднего: ${describeStep3MeanLevel(mean)}`,
    "",
    "Ответы_по_каждому_утверждению:",
  ];
  for (const { key, text } of STEP3_QUESTION_TEXTS) {
    const a = data[key] as LikertAnswer | null | undefined;
    const score = a ? likertAnswerToScore(a) : 0;
    const ru = likertAnswerRuShort(a);
    lines.push(
      `${String(key).toUpperCase()}: «${text}» — ${ru} (балл ${String(score)})`
    );
  }
  return lines.join("\n");
}
