import type { MaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";

/** Уровень шкалы EE/DP: чем выше балл, тем хуже. */
export type MaslachEeDpLevel = "low" | "medium" | "high";

/**
 * Уровень шкалы PA: низкий балл — неблагоприятно, высокий — благоприятно.
 */
export type MaslachPaLevel = "low" | "medium" | "high";

export type MaslachScaleRow = {
  key: "ee" | "dp" | "pa";
  title: string;
  score: number;
  level: MaslachEeDpLevel | MaslachPaLevel;
  levelLabel: string;
  /** true — показатель ухудшает картину выгорания */
  unfavorable: boolean;
};

export type MaslachBurnoutInterpretation = {
  ee: MaslachScaleRow;
  dp: MaslachScaleRow;
  pa: MaslachScaleRow;
  /** Классическое выгорание: высокие EE + DP и низкие PA */
  classicBurnout: boolean;
  verdictTitle: string;
  verdictText: string;
  recommendationLines: ReadonlyArray<string>;
};

/** Пороги интерпретации MBI (Маслач / Jackson). */
export const MASLACH_EE_HIGH_MIN = 25;
export const MASLACH_EE_MEDIUM_MIN = 16;
export const MASLACH_DP_HIGH_MIN = 11;
export const MASLACH_DP_MEDIUM_MIN = 6;
export const MASLACH_PA_LOW_MAX = 30;
export const MASLACH_PA_MEDIUM_MIN = 31;
export const MASLACH_PA_HIGH_MIN = 37;

const EE_LEVEL_LABELS: Record<MaslachEeDpLevel, string> = {
  low: "Низкий уровень",
  medium: "Средний уровень",
  high: "Высокий уровень",
};

const DP_LEVEL_LABELS: Record<MaslachEeDpLevel, string> = {
  low: "Низкий уровень",
  medium: "Средний уровень",
  high: "Высокий уровень",
};

const PA_LEVEL_LABELS: Record<MaslachPaLevel, string> = {
  low: "Низкий уровень",
  medium: "Средний уровень",
  high: "Высокий уровень",
};

/**
 * Классифицирует балл эмоционального истощения (EE).
 */
export function classifyMaslachEe(score: number): MaslachEeDpLevel {
  if (score >= MASLACH_EE_HIGH_MIN) {
    return "high";
  }
  if (score >= MASLACH_EE_MEDIUM_MIN) {
    return "medium";
  }
  return "low";
}

/**
 * Классифицирует балл деперсонализации (DP).
 */
export function classifyMaslachDp(score: number): MaslachEeDpLevel {
  if (score >= MASLACH_DP_HIGH_MIN) {
    return "high";
  }
  if (score >= MASLACH_DP_MEDIUM_MIN) {
    return "medium";
  }
  return "low";
}

/**
 * Классифицирует балл профессиональных достижений (PA).
 */
export function classifyMaslachPa(score: number): MaslachPaLevel {
  if (score >= MASLACH_PA_HIGH_MIN) {
    return "high";
  }
  if (score >= MASLACH_PA_MEDIUM_MIN) {
    return "medium";
  }
  return "low";
}

/**
 * Строит интерпретацию трёх шкал MBI и итоговый вердикт.
 */
export function buildMaslachBurnoutInterpretation(
  scores: MaslachBurnoutScores
): MaslachBurnoutInterpretation | null {
  if (scores.ee === null || scores.dp === null || scores.pa === null) {
    return null;
  }

  const eeLevel = classifyMaslachEe(scores.ee);
  const dpLevel = classifyMaslachDp(scores.dp);
  const paLevel = classifyMaslachPa(scores.pa);

  const ee: MaslachScaleRow = {
    key: "ee",
    title: "Эмоциональное истощение",
    score: scores.ee,
    level: eeLevel,
    levelLabel: EE_LEVEL_LABELS[eeLevel],
    unfavorable: eeLevel === "high",
  };
  const dp: MaslachScaleRow = {
    key: "dp",
    title: "Деперсонализация (цинизм)",
    score: scores.dp,
    level: dpLevel,
    levelLabel: DP_LEVEL_LABELS[dpLevel],
    unfavorable: dpLevel === "high",
  };
  const pa: MaslachScaleRow = {
    key: "pa",
    title: "Профессиональные достижения",
    score: scores.pa,
    level: paLevel,
    levelLabel: PA_LEVEL_LABELS[paLevel],
    unfavorable: paLevel === "low",
  };

  const classicBurnout = eeLevel === "high" && dpLevel === "high" && paLevel === "low";

  const verdictTitle = classicBurnout
    ? "Признаки профессионального выгорания"
    : _hasConcerningScale(ee, dp, pa)
      ? "Отдельные показатели требуют внимания"
      : "Выраженного синдрома выгорания не выявлено";

  const verdictText = classicBurnout
    ? "Сочетание высокого эмоционального истощения, высокой деперсонализации и низких профессиональных достижений соответствует классической картине профессионального выгорания."
    : _hasConcerningScale(ee, dp, pa)
      ? "Хотя полная картина выгорания не сформирована, отдельные шкалы выходят за пределы благоприятного диапазона. Рекомендуется обсудить результаты с сотрудником и при необходимости назначить повторный контроль."
      : "Показатели по трём шкалам не образуют классическую картину выгорания. Рекомендуется учитывать контекст работы и динамику при повторных измерениях.";

  return {
    ee,
    dp,
    pa,
    classicBurnout,
    verdictTitle,
    verdictText,
    recommendationLines: classicBurnout
      ? _classicBurnoutRecommendations()
      : _hasConcerningScale(ee, dp, pa)
        ? _concerningRecommendations(ee, dp, pa)
        : _stableRecommendations(),
  };
}

/**
 * Классическое выгорание: высокие EE и DP, низкие PA.
 */
export function isClassicMaslachBurnout(scores: MaslachBurnoutScores): boolean {
  const interpretation = buildMaslachBurnoutInterpretation(scores);
  return interpretation?.classicBurnout === true;
}

/**
 * Есть ли хотя бы одна неблагоприятная шкала (высокие EE/DP или низкие PA).
 */
export function hasConcerningMaslachScale(scores: MaslachBurnoutScores): boolean {
  const interpretation = buildMaslachBurnoutInterpretation(scores);
  if (!interpretation) {
    return false;
  }
  return _hasConcerningScale(interpretation.ee, interpretation.dp, interpretation.pa);
}

function _hasConcerningScale(
  ee: MaslachScaleRow,
  dp: MaslachScaleRow,
  pa: MaslachScaleRow
): boolean {
  return ee.unfavorable || dp.unfavorable || pa.unfavorable;
}

function _classicBurnoutRecommendations(): ReadonlyArray<string> {
  return [
    "Признайте состояние как сигнал, требующий внимания руководителя и HrD.",
    "Обсудите с сотрудником нагрузку, границы рабочего времени и источники стресса.",
    "Рассмотрите снижение перегрузки, перераспределение задач или поддержку специалиста.",
    "Назначьте повторное тестирование через 3 месяца для контроля динамики.",
  ];
}

function _concerningRecommendations(
  ee: MaslachScaleRow,
  dp: MaslachScaleRow,
  pa: MaslachScaleRow
): ReadonlyArray<string> {
  const focus: string[] = [];
  if (ee.unfavorable) {
    focus.push("восстановление эмоциональных ресурсов и режима отдыха");
  }
  if (dp.unfavorable) {
    focus.push("снижение отстранённости и цинизма в отношении коллег и задач");
  }
  if (pa.unfavorable) {
    focus.push("поддержку ощущения ценности и компетентности в работе");
  }
  return [
    `Сфокусируйтесь на: ${focus.join("; ")}.`,
    "Проведите содержательную беседу с сотрудником по результатам опросника.",
    "При необходимости назначьте повторный тест на выгорание через 3 месяца.",
  ];
}

function _stableRecommendations(): ReadonlyArray<string> {
  return [
    "Сохраняйте регулярный контроль нагрузки и рабочей атмосферы.",
    "Повторное тестирование целесообразно при изменении условий труда или по плану мониторинга.",
  ];
}
