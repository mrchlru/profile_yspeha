import type { SpecialistScaleInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";

export const SPECIALIST_SCREENING_SCALES_HINT =
  "PHQ-9 0–27 · GAD-7 0–21 · ASRS часть A 0–6 положительных · скрининг, не диагноз";

export type SpecialistScaleDetail = {
  key: SpecialistScaleInterpretation["key"];
  title: string;
  shortTitle: string;
  score: number;
  maxScore: number;
  percent: number;
  levelLabel: string;
  unfavorable: boolean;
  note: string;
  /** Что измеряет шкала. */
  meaning: string;
  /** Интерпретация текущего уровня. */
  levelText: string;
};

const SCALE_MEANING: Record<SpecialistScaleInterpretation["key"], string> = {
  phq9:
    "Скрининг выраженности депрессивных симптомов за последние 2 недели: настроение, интерес к делам, сон, энергия, аппетит, самооценка, концентрация, психомоторные изменения.",
  gad7:
    "Скрининг тревожных симптомов: беспокойство, невозможность расслабиться, раздражительность, страх, что случится что-то плохое.",
  asrs:
    "Краткий скрининг внимания и гиперактивности/импульсивности (часть A ASRS v1.1). Положительный результат — повод для углублённой оценки, не диагноз СДВГ.",
};

const PHQ9_LEVEL_TEXT: Record<string, string> = {
  none: "Минимальные сигналы по шкале депрессивных симптомов. Направление по PHQ-9 обычно не требуется, если нет других тревожных признаков.",
  mild: "Лёгкая выраженность симптомов. Имеет смысл внимательно отнестись к нагрузке и самочувствию; при ухудшении — повторный скрининг или консультация специалиста.",
  moderate:
    "Умеренная выраженность: порог клинического внимания обычно считается достигнутым (≥10). Рекомендуется конфиденциальное направление к специалисту.",
  moderately_severe:
    "Умеренно тяжёлая выраженность симптомов. Направление к специалисту целесообразно в приоритетном порядке, с учётом нагрузки и поддержки на работе.",
  severe:
    "Тяжёлая выраженность по скринингу. Нужны быстрые конфиденциальные действия: разговор и предложение профессиональной помощи.",
};

const GAD7_LEVEL_TEXT: Record<string, string> = {
  minimal:
    "Минимальная тревога по шкале. Отдельное направление по GAD-7 обычно не показано при отсутствии других сигналов.",
  mild: "Лёгкая тревога. Стоит учесть стресс и режим работы; при нарастании симптомов — повторный скрининг или консультация.",
  moderate:
    "Умеренная тревога: порог клинического внимания обычно ≥10. Рекомендуется обсуждение и направление к специалисту.",
  severe:
    "Тяжёлая тревога по скринингу. Приоритет — конфиденциальная поддержка и направление к специалисту без откладывания.",
};

const ASRS_LEVEL_TEXT: Record<string, string> = {
  negative:
    "Скрининг части A отрицательный (<4 положительных ответов). Отдельное направление по ASRS не показано.",
  positive:
    "Скрининг части A положительный (≥4 из 6). Это сигнал к углублённой оценке внимания/импульсивности у специалиста, а не диагноз СДВГ.",
};

/**
 * Собирает карточки шкал с расшифровкой для отчёта и ИИ.
 */
export function buildSpecialistScaleDetails(
  scales: ReadonlyArray<SpecialistScaleInterpretation>
): ReadonlyArray<SpecialistScaleDetail> {
  return scales.map((scale) => {
    const percent =
      scale.maxScore > 0 ? Math.round((scale.score / scale.maxScore) * 100) : 0;
    return {
      key: scale.key,
      title: scale.title,
      shortTitle: _shortTitle(scale.key),
      score: scale.score,
      maxScore: scale.maxScore,
      percent,
      levelLabel: scale.levelLabel,
      unfavorable: scale.unfavorable,
      note: scale.note,
      meaning: SCALE_MEANING[scale.key],
      levelText: _levelText(scale),
    };
  });
}

function _shortTitle(key: SpecialistScaleInterpretation["key"]): string {
  if (key === "phq9") return "PHQ-9";
  if (key === "gad7") return "GAD-7";
  return "ASRS";
}

function _levelText(scale: SpecialistScaleInterpretation): string {
  if (scale.key === "phq9") {
    return PHQ9_LEVEL_TEXT[scale.level] ?? scale.levelLabel;
  }
  if (scale.key === "gad7") {
    return GAD7_LEVEL_TEXT[scale.level] ?? scale.levelLabel;
  }
  return ASRS_LEVEL_TEXT[scale.level] ?? scale.levelLabel;
}

/**
 * Класс бейджа уровня: неблагоприятный — янтарный/красный, иначе спокойный.
 */
export function specialistScaleBadgeClass(unfavorable: boolean): string {
  if (unfavorable) {
    return "bg-amber-100 text-amber-950";
  }
  return "bg-emerald-100 text-emerald-900";
}
