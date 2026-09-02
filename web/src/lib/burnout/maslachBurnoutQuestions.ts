/** Вариант ответа шкалы частоты Маслач (0 — «никогда», 6 — «всегда»). */
export type MaslachBurnoutOptionId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MaslachBurnoutOption = {
  id: MaslachBurnoutOptionId;
  label: string;
};

export type MaslachBurnoutQuestion = {
  index: number;
  text: string;
};

export const MASLACH_BURNOUT_QUESTION_COUNT = 22;

/** Шкала частоты — одинакова для всех 22 утверждений. */
export const MASLACH_BURNOUT_OPTIONS: ReadonlyArray<MaslachBurnoutOption> = [
  { id: 0, label: "Никогда" },
  { id: 1, label: "Очень редко" },
  { id: 2, label: "Редко" },
  { id: 3, label: "Иногда" },
  { id: 4, label: "Часто" },
  { id: 5, label: "Очень часто" },
  { id: 6, label: "Всегда" },
];

/** 22 утверждения опросника Маслач (адаптация Водопьяновой). */
export const MASLACH_BURNOUT_QUESTIONS: ReadonlyArray<MaslachBurnoutQuestion> = [
  { index: 1, text: "Я чувствую себя эмоционально опустошенным" },
  { index: 2, text: "После работы я чувствую себя, как «выжатый лимон»" },
  { index: 3, text: "Утром я чувствую усталость и нежелание идти на работу" },
  {
    index: 4,
    text:
      "Я хорошо понимаю, что чувствуют мои коллеги, ученики и стараюсь учитывать это в интересах дела",
  },
  {
    index: 5,
    text: "Я чувствую, что общаюсь с некоторыми коллегами, учениками без теплоты и расположения к ним",
  },
  { index: 6, text: "После работы мне на некоторое время хочется уединиться" },
  {
    index: 7,
    text: "Я умею находить правильное решение в конфликтных ситуациях, возникающих при общении",
  },
  { index: 8, text: "Я чувствую угнетенность и апатию" },
  { index: 9, text: "Я уверен, что моя работа нужна людям" },
  {
    index: 10,
    text: "В последнее время я стал более черствым по отношению к тем, с кем я работаю",
  },
  { index: 11, text: "Я замечаю, что моя работа ожесточает меня" },
  { index: 12, text: "У меня много планов на будущее, и я верю в их осуществление" },
  { index: 13, text: "Моя работа все больше меня разочаровывает" },
  { index: 14, text: "Мне кажется, что я слишком много работаю" },
  {
    index: 15,
    text:
      "Бывает, что мне действительно безразлично то, что происходит с некоторыми моими подчиненными/воспитанниками и коллегами",
  },
  { index: 16, text: "Мне хочется уединиться и отдохнуть от всего и всех" },
  {
    index: 17,
    text: "Я легко могу создать атмосферу доброжелательности и сотрудничества в коллективе",
  },
  { index: 18, text: "Во время работы я чувствую приятное оживление" },
  {
    index: 19,
    text: "Благодаря своей работе я уже сделал в жизни много действительно ценного",
  },
  {
    index: 20,
    text:
      "Я чувствую равнодушие и потерю интереса ко многому, что радовало меня в моей работе",
  },
  {
    index: 21,
    text: "На работе я спокойно справляюсь с эмоциональными проблемами",
  },
  {
    index: 22,
    text:
      "В последнее время мне кажется, что коллеги и подчиненные, воспитанники все чаще перекладывают на меня груз своих проблем и обязанностей",
  },
];

export type MaslachBurnoutAnswers = Record<string, MaslachBurnoutOptionId | null>;

/**
 * Пустой объект ответов по всем 22 вопросам.
 */
export function createEmptyMaslachBurnoutAnswers(): MaslachBurnoutAnswers {
  const answers: MaslachBurnoutAnswers = {};
  for (const question of MASLACH_BURNOUT_QUESTIONS) {
    answers[`q${String(question.index)}`] = null;
  }
  return answers;
}

/**
 * Считает число заполненных ответов.
 */
export function countMaslachBurnoutAnswered(answers: MaslachBurnoutAnswers): number {
  let count = 0;
  for (const question of MASLACH_BURNOUT_QUESTIONS) {
    const value = answers[`q${String(question.index)}`];
    if (typeof value === "number") {
      count += 1;
    }
  }
  return count;
}

/**
 * Проверяет, что все 22 вопроса заполнены.
 */
export function isMaslachBurnoutComplete(answers: MaslachBurnoutAnswers): boolean {
  return countMaslachBurnoutAnswered(answers) >= MASLACH_BURNOUT_QUESTION_COUNT;
}

/**
 * Приводит сырое значение к допустимому варианту шкалы.
 */
export function coerceMaslachBurnoutAnswer(raw: unknown): MaslachBurnoutOptionId | null {
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return null;
  }
  if (raw < 0 || raw > 6) {
    return null;
  }
  return raw as MaslachBurnoutOptionId;
}
