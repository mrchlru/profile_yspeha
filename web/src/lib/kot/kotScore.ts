import {
  describeKotIpLevel,
  isKotOfficialAnswerCorrect,
  KOT_IP_NORM_NOTE,
} from "@/lib/kot/kotOfficial50Scoring";
import type { KotQuestionKey } from "@/lib/kot/step1Types";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import type { Step1Data } from "@/store/useFormStore";

/**
 * Число верных ответов (Ип) по ключу методички Пашукова и др., 1996.
 */
export function countKotRawScore(step1: Step1Data): number {
  let correct = 0;
  for (let i = 1; i <= KOT_STEP_QUESTION_COUNT; i += 1) {
    const key = `q${String(i)}` as KotQuestionKey;
    if (isKotOfficialAnswerCorrect(key, step1[key])) {
      correct += 1;
    }
  }
  return correct;
}

export function getKotIpNormNote(): string {
  return KOT_IP_NORM_NOTE;
}

export function getKotIpLevelLabel(rawScore: number): string {
  return describeKotIpLevel(rawScore);
}
