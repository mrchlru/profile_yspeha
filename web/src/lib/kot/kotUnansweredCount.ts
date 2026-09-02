import type { Step1Data } from "@/store/useFormStore";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";

/**
 * Число заданий КОТ без ответа (null, пусто или только пробелы).
 */
export function getKotUnansweredCount(data: Step1Data): number {
  let n = 0;
  for (let i = 1; i <= KOT_STEP_QUESTION_COUNT; i += 1) {
    const key = `q${String(i)}` as keyof Step1Data;
    const v = data[key];
    if (v === null || v === undefined || String(v).trim() === "") {
      n += 1;
    }
  }
  return n;
}
