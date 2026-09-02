import { sanitizeForAiInput, truncateForAiContext } from "@/lib/ai/sanitizeForAi";
import { buildStep4AiSummary } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/store/useFormStore";

/**
 * Собирает развёрнутый контекст для LLM (расширенная анкета + имя).
 */
export function buildKotConclusionContext(
  profileName: string,
  step4: Step4Data
): string {
  const name = sanitizeForAiInput(profileName, 80);
  const summary = truncateForAiContext(buildStep4AiSummary(step4), 16000);
  return [`Имя_профиля: ${name}`, "", summary].join("\n");
}
