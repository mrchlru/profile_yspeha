import type { ScoreBand } from "@/lib/attestation/computeAttestationScores";
import type { MiniIpipFactor } from "@/lib/attestation/attestationQuestions";
import { MINI_IPIP_FACTOR_LABELS } from "@/lib/attestation/attestationLabels";

/**
 * Пороги уровня для Mini-IPIP (сумма 4 пунктов, диапазон 4–20).
 * Соответствуют ориентирам BFI по среднему 1–5: ≤2.5 / 2.6–3.5 / ≥3.6
 * (источник порогов: конвенция интерпретации Big Five / BFI).
 */
export const MINI_IPIP_BAND_HINT =
  "Mini-IPIP · сумма 4–20 · низкий 4–10 · средний 11–14 · высокий 15–20";

export type MiniIpipFactorInterpretation = {
  factor: MiniIpipFactor;
  label: string;
  score: number;
  band: ScoreBand;
  /** Краткое описание фактора. */
  meaning: string;
  /** Интерпретация выраженности по текущему уровню. */
  levelText: string;
};

const FACTOR_MEANING: Record<MiniIpipFactor, string> = {
  Extraversion:
    "Общительность, активность, энергичность, напористость, склонность к положительным эмоциям.",
  Agreeableness:
    "Доверие, альтруизм, отзывчивость, готовность к сотрудничеству и прощению.",
  Conscientiousness:
    "Организованность, надёжность, самодисциплина, целеустремлённость и аккуратность.",
  Neuroticism:
    "Эмоциональная неустойчивость, тревожность, подверженность стрессу, перепады настроения. Низкий балл — эмоциональная стабильность.",
  Openness:
    "Любознательность, воображение, оригинальность, интерес к новым идеям и опыту.",
};

const LEVEL_TEXT: Record<MiniIpipFactor, Record<ScoreBand, string>> = {
  Extraversion: {
    low: "Склонность к интроверсии: сдержанность, меньшая потребность в постоянном общении, работа в более спокойном режиме.",
    mid: "Умеренная общительность: комфорт и в команде, и в самостоятельной работе; энергия проявляется ситуативно.",
    high: "Выраженная экстраверсия: общительность, активность, оптимизм; легко включается в контакт и задаёт темп.",
  },
  Agreeableness: {
    low: "Более критичная и конкурентная позиция: скептицизм, жёсткость в переговорах, риск трения в команде.",
    mid: "Гибкий баланс кооперации и собственной позиции: сотрудничает, но не теряет границы.",
    high: "Высокая доброжелательность: доверие, отзывчивость, кооперативность; сильная сторона в командной работе.",
  },
  Conscientiousness: {
    low: "Склонность к импульсивности и меньшей структурированности: риск срывов сроков и небрежности в деталях.",
    mid: "Рабочая организованность без жёсткой перфекционистской фиксации; дисциплина зависит от контекста.",
    high: "Высокая добросовестность: организованность, целеустремлённость, самоконтроль — опора для роли управляющего.",
  },
  Neuroticism: {
    low: "Эмоциональная стабильность: спокойствие под нагрузкой, ниже реактивность на стресс.",
    mid: "Средняя чувствительность к стрессу: в обычных условиях устойчив, при пиковых нагрузках нужна поддержка режима.",
    high: "Повышенная эмоциональная реактивность: тревожность и чувствительность к стрессу; важны нагрузка, ритм и поддержка.",
  },
  Openness: {
    low: "Практичность и приверженность привычному: сильнее в отработанных процессах, слабее в экспериментах.",
    mid: "Открытость к новому без ухода в постоянные эксперименты; баланс привычного и изменений.",
    high: "Высокая открытость: любознательность, креативность, широта интересов; сильнее в изменениях и поиске решений.",
  },
};

/**
 * Определяет уровень фактора Mini-IPIP по сумме баллов (4–20).
 */
export function miniIpipScoreBand(score: number): ScoreBand {
  if (score <= 10) {
    return "low";
  }
  if (score <= 14) {
    return "mid";
  }
  return "high";
}

/**
 * Собирает интерпретации по всем факторам Big Five для отчёта и ИИ.
 */
export function buildMiniIpipInterpretations(
  scores: Record<MiniIpipFactor, number>
): ReadonlyArray<MiniIpipFactorInterpretation> {
  const factors: ReadonlyArray<MiniIpipFactor> = [
    "Extraversion",
    "Agreeableness",
    "Conscientiousness",
    "Neuroticism",
    "Openness",
  ];
  return factors.map((factor) => {
    const score = scores[factor];
    const band = miniIpipScoreBand(score);
    return {
      factor,
      label: MINI_IPIP_FACTOR_LABELS[factor],
      score,
      band,
      meaning: FACTOR_MEANING[factor],
      levelText: LEVEL_TEXT[factor][band],
    };
  });
}
