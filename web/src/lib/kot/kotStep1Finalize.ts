import type { KotQuestionKey, KotStep1Data } from "@/lib/kot/step1Types";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";

/**
 * По методичке Ип — число верных из 50; пропуск и пустой ответ = не зачтён (см. `isKotOfficialAnswerCorrect`).
 * После срабатывания таймера КОТ подставляем пустую строку вместо null, чтобы можно было
 * перейти дальше и отправить анкету на сервер.
 */
export function finalizeKotStep1AfterTimeout(data: KotStep1Data): KotStep1Data {
  const next = { ...data };
  for (let i = 1; i <= KOT_STEP_QUESTION_COUNT; i += 1) {
    const k = `q${String(i)}` as KotQuestionKey;
    if (next[k] === null || next[k] === undefined) {
      next[k] = "";
    }
  }
  return next;
}
