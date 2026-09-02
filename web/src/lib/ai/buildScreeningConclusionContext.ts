import { buildKotConclusionContext } from "@/lib/ai/buildKotConclusionContext";
import { sanitizeForAiInput, truncateForAiContext } from "@/lib/ai/sanitizeForAi";
import { buildStep3LikertBlockForAi } from "@/lib/ai/step3LikertContextForAi";
import {
  computeGerchikovProfile,
  gerchikovInterpretation,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import type { GerchikovStep2Data } from "@/lib/gerchikov/step2Types";
import { gerchikovStep2ToAuditAnswers } from "@/lib/gerchikov/step2Types";
import type { Step3Data, Step4Data } from "@/store/useFormStore";

/**
 * Собирает развёрнутый текст для LLM: три методики (КОТ, Герчиков, Ликерт) и анкета.
 */
export function buildScreeningConclusionContext(input: {
  rawScore: number;
  maxScore: number;
  kotIpLevelLabel: string;
  kotIpNormNote: string;
  profileName: string;
  step2: GerchikovStep2Data;
  step3: Step3Data;
  step4: Step4Data;
}): string {
  const profileBlock = buildKotConclusionContext(input.profileName, input.step4);
  const gerchikovProfile = computeGerchikovProfile(gerchikovStep2ToAuditAnswers(input.step2));
  const gerchikovBlock = gerchikovInterpretation(gerchikovProfile);
  const step2FullJson = truncateForAiContext(JSON.stringify(input.step2), 28000);
  const step3Block = buildStep3LikertBlockForAi(input.step3);

  const kotBlock = [
    "Название: КОТ (краткий ориентировочный тест по методике Бузина/Вандерлик; даёт ориентир по интеллектуальным/общим способностям в формате теста).",
    "Показатель: Ип — число верных ответов из 50.",
    `КОТ_Ип_число_верных: ${String(input.rawScore)} из ${String(input.maxScore)}`,
    `КОТ_уровень_по_методичке: ${sanitizeForAiInput(input.kotIpLevelLabel, 120)}`,
    `КОТ_примечание_к_нормам: ${sanitizeForAiInput(input.kotIpNormNote, 400)}`,
  ].join("\n");

  return [
    "=== СКРИНИНГ: три методики + расширенная анкета; используй все блоки при выводах ===",
    "",
    "--- Методика 2. Опросник мотивации Герчикова (идентичен аудиту состояния) ---",
    sanitizeForAiInput(gerchikovBlock, 12000),
    "",
    "Все_ответы_респондента_по_опроснику_Герчикова_JSON (сырой шаг 2, полный объём):",
    step2FullJson,
    "",
    "--- Методика 1. КОТ (интеллектуальные/общие способности) ---",
    kotBlock,
    "",
    "--- Методика 3. Шкала Ликерта (шаг 3; эмоциональный фон, самооценка состояния) ---",
    step3Block,
    "",
    "--- Анкета (шаг 4; личные данные, образование, опыт и пр.) ---",
    profileBlock,
  ].join("\n");
}
