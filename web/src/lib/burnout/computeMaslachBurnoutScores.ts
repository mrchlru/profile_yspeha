import {
  coerceMaslachBurnoutAnswer,
  MASLACH_BURNOUT_QUESTION_COUNT,
  MASLACH_BURNOUT_QUESTIONS,
  type MaslachBurnoutAnswers,
} from "@/lib/burnout/maslachBurnoutQuestions";

/** Эмоциональное истощение (EE). */
const EE_ITEM_INDEXES: ReadonlyArray<number> = [1, 2, 3, 6, 8, 13, 14, 16, 20];

/** Деперсонализация (DP). */
const DP_ITEM_INDEXES: ReadonlyArray<number> = [5, 10, 11, 15, 22];

/** Редукция профессиональных достижений (PA), обратное кодирование. */
const PA_ITEM_INDEXES: ReadonlyArray<number> = [4, 7, 9, 12, 17, 18, 19, 21];

export type MaslachBurnoutScores = {
  ee: number | null;
  dp: number | null;
  pa: number | null;
  answeredCount: number;
  totalItems: number;
};

/**
 * Считает сырые суммы по трём шкалам Маслач (интерпретация — позже).
 */
export function computeMaslachBurnoutScores(
  answers: MaslachBurnoutAnswers | null | undefined
): MaslachBurnoutScores {
  const empty: MaslachBurnoutScores = {
    ee: null,
    dp: null,
    pa: null,
    answeredCount: 0,
    totalItems: MASLACH_BURNOUT_QUESTION_COUNT,
  };
  if (!answers) {
    return empty;
  }

  let answeredCount = 0;
  for (const question of MASLACH_BURNOUT_QUESTIONS) {
    if (coerceMaslachBurnoutAnswer(answers[`q${String(question.index)}`]) !== null) {
      answeredCount += 1;
    }
  }

  const readScore = (index: number): number | null =>
    coerceMaslachBurnoutAnswer(answers[`q${String(index)}`]);

  const sumDirect = (indexes: ReadonlyArray<number>): number | null => {
    let sum = 0;
    for (const index of indexes) {
      const score = readScore(index);
      if (score === null) {
        return null;
      }
      sum += score;
    }
    return sum;
  };

  const sumReversed = (indexes: ReadonlyArray<number>): number | null => {
    let sum = 0;
    for (const index of indexes) {
      const score = readScore(index);
      if (score === null) {
        return null;
      }
      sum += 6 - score;
    }
    return sum;
  };

  const complete = answeredCount >= MASLACH_BURNOUT_QUESTION_COUNT;

  return {
    ee: complete ? sumDirect(EE_ITEM_INDEXES) : null,
    dp: complete ? sumDirect(DP_ITEM_INDEXES) : null,
    pa: complete ? sumReversed(PA_ITEM_INDEXES) : null,
    answeredCount,
    totalItems: MASLACH_BURNOUT_QUESTION_COUNT,
  };
}
