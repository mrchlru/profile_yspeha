import type { ScoreBand } from "@/lib/attestation/computeAttestationScores";
import type {
  KlimovProfessionType,
  ManagementPotentialScale,
  MiniIpipFactor,
} from "@/lib/attestation/attestationQuestions";

/** Русские названия факторов Mini-IPIP (Big Five). */
export const MINI_IPIP_FACTOR_LABELS: Record<MiniIpipFactor, string> = {
  Extraversion: "Экстраверсия",
  Agreeableness: "Доброжелательность",
  Conscientiousness: "Добросовестность",
  Neuroticism: "Нейротизм",
  Openness: "Открытость опыту",
};

/** Порядок вывода факторов Big Five. */
export const MINI_IPIP_FACTOR_ORDER: ReadonlyArray<MiniIpipFactor> = [
  "Extraversion",
  "Agreeableness",
  "Conscientiousness",
  "Neuroticism",
  "Openness",
];

/** Русские названия шкал управленческого потенциала. */
export const MANAGEMENT_POTENTIAL_SCALE_LABELS: Record<ManagementPotentialScale, string> = {
  decision_making: "Принятие решений",
  delegation: "Делегирование",
  stress_resilience: "Стрессоустойчивость",
  team_leadership: "Лидерство в команде",
  integrity: "Деловая этика",
};

/** Русские названия шкал CBI. */
export const CBI_SCALE_LABELS: Record<"personal" | "work", string> = {
  personal: "Личное истощение",
  work: "Рабочее истощение",
};

/** Русские названия шкал Шпилбергера. */
export const SPIELBERGER_SCALE_LABELS: Record<"state" | "trait", string> = {
  state: "Ситуативная тревожность",
  trait: "Личностная тревожность",
};

/** Русские названия типов ДДО Климова. */
export const KLIMOV_TYPE_LABELS: Record<KlimovProfessionType, string> = {
  human_nature: "Человек — природа",
  human_technique: "Человек — техника",
  human_human: "Человек — человек",
  human_sign_system: "Человек — знаковая система",
  human_artistic_image: "Человек — художественный образ",
};

/** Диапазоны низкий / средний / высокий. */
export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  low: "Низкий",
  mid: "Средний",
  high: "Высокий",
};

/**
 * Возвращает русскую подпись диапазона.
 */
export function scoreBandLabel(band: ScoreBand): string {
  return SCORE_BAND_LABELS[band];
}

/**
 * Цветовой акцент бейджа диапазона.
 */
export function scoreBandBadgeClass(band: ScoreBand): string {
  if (band === "high") {
    return "bg-emerald-100 text-emerald-900";
  }
  if (band === "mid") {
    return "bg-amber-100 text-amber-950";
  }
  return "bg-slate-200 text-slate-800";
}
