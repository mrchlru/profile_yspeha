/** Вариант ответа PHQ-9 / GAD-7 (0 — «никогда», 3 — «почти каждый день»). */
export type PhqGadOptionId = 0 | 1 | 2 | 3;

/** Вариант ответа ASRS v1.1 часть A (0 — «никогда», 4 — «очень часто»). */
export type AsrsOptionId = 0 | 1 | 2 | 3 | 4;

export type SpecialistScreeningOptionId = PhqGadOptionId | AsrsOptionId;

export type SpecialistScreeningOption = {
  id: SpecialistScreeningOptionId;
  label: string;
};

export type SpecialistScreeningSectionId = "phq9" | "gad7" | "asrs";

export type SpecialistScreeningQuestion = {
  /** Глобальный ключ ответа: phq9_q1 … asrs_q6. */
  id: string;
  sectionId: SpecialistScreeningSectionId;
  /** Номер внутри секции (1-based). */
  indexInSection: number;
  text: string;
  scale: "phq_gad" | "asrs";
};

export const PHQ_GAD_OPTIONS: ReadonlyArray<SpecialistScreeningOption> = [
  { id: 0, label: "Никогда" },
  { id: 1, label: "Несколько дней" },
  { id: 2, label: "Более половины дней" },
  { id: 3, label: "Почти каждый день" },
];

export const ASRS_OPTIONS: ReadonlyArray<SpecialistScreeningOption> = [
  { id: 0, label: "Никогда" },
  { id: 1, label: "Редко" },
  { id: 2, label: "Иногда" },
  { id: 3, label: "Часто" },
  { id: 4, label: "Очень часто" },
];

export const SPECIALIST_SCREENING_SECTION_TITLES: Record<SpecialistScreeningSectionId, string> = {
  phq9: "PHQ-9 — скрининг депрессивных симптомов",
  gad7: "GAD-7 — скрининг генерализованного тревожного расстройства",
  asrs: "ASRS v1.1 (часть A) — скрининг СДВГ у взрослых",
};

export const SPECIALIST_SCREENING_SECTION_PROMPTS: Record<SpecialistScreeningSectionId, string> = {
  phq9: "За последние 2 недели, как часто вас беспокоило:",
  gad7: "За последние 2 недели, как часто вас беспокоило:",
  asrs: "Как часто за последние 6 месяцев у вас бывало следующее:",
};

const PHQ9_TEXTS: ReadonlyArray<string> = [
  "Снижение интереса или удовольствия от занятий, которые обычно нравятся",
  "Чувство подавленности, депрессии или безнадёжности",
  "Трудности с засыпанием, прерывистый сон или, наоборот, слишком долгий сон",
  "Чувство усталости или упадка сил",
  "Плохой аппетит или переедание",
  "Плохое отношение к себе — чувство, что вы неудачник(-ца) или подвели себя и семью",
  "Трудности с концентрацией внимания (например, при чтении или работе)",
  "Настолько медленные движения или речь, что это заметили окружающие; либо, наоборот, необычная суетливость и беспокойство",
  "Мысли о том, что лучше было бы умереть, или мысли о причинении себе вреда",
];

const GAD7_TEXTS: ReadonlyArray<string> = [
  "Ощущение нервозности, тревоги или взвинченности",
  "Неспособность остановить или контролировать беспокойство",
  "Чрезмерное беспокойство по разным поводам",
  "Трудности с тем, чтобы расслабиться",
  "Настолько сильное беспокойство, что трудно усидеть на месте",
  "Раздражительность, лёгкая возбудимость",
  "Ощущение страха, как будто вот-вот случится что-то ужасное",
];

const ASRS_TEXTS: ReadonlyArray<string> = [
  "Как часто вам бывает трудно закончить работу после того, как самое трудное и интересное уже сделано?",
  "Как часто вам бывает трудно навести порядок перед выполнением работы, требующей организованности?",
  "Как часто у вас возникают трудности с запоминанием времени встреч или своих обязанностей?",
  "Как часто вы избегаете или откладываете начало работы, требующей больших умственных усилий?",
  "Как часто вы беспокойно перебираете руками или ногами, когда приходится долго сидеть на одном месте?",
  "Как часто вы испытываете чрезмерную активность и непреодолимое желание что-то сделать, «как будто внутри мотор»?",
];

function _buildSectionQuestions(
  sectionId: SpecialistScreeningSectionId,
  texts: ReadonlyArray<string>,
  scale: "phq_gad" | "asrs"
): ReadonlyArray<SpecialistScreeningQuestion> {
  return texts.map((text, offset) => {
    const indexInSection = offset + 1;
    return {
      id: `${sectionId}_q${String(indexInSection)}`,
      sectionId,
      indexInSection,
      text,
      scale,
    };
  });
}

export const SPECIALIST_SCREENING_QUESTIONS: ReadonlyArray<SpecialistScreeningQuestion> = [
  ..._buildSectionQuestions("phq9", PHQ9_TEXTS, "phq_gad"),
  ..._buildSectionQuestions("gad7", GAD7_TEXTS, "phq_gad"),
  ..._buildSectionQuestions("asrs", ASRS_TEXTS, "asrs"),
];

export const SPECIALIST_SCREENING_QUESTION_COUNT = SPECIALIST_SCREENING_QUESTIONS.length;

export const PHQ9_ITEM9_QUESTION_ID = "phq9_q9";

export type SpecialistScreeningAnswers = Record<string, SpecialistScreeningOptionId | null>;

/**
 * Пустой объект ответов по всем вопросам скрининга.
 */
export function createEmptySpecialistScreeningAnswers(): SpecialistScreeningAnswers {
  const answers: SpecialistScreeningAnswers = {};
  for (const question of SPECIALIST_SCREENING_QUESTIONS) {
    answers[question.id] = null;
  }
  return answers;
}

/**
 * Считает число заполненных ответов.
 */
export function countSpecialistScreeningAnswered(answers: SpecialistScreeningAnswers): number {
  let count = 0;
  for (const question of SPECIALIST_SCREENING_QUESTIONS) {
    const value = answers[question.id];
    if (typeof value === "number") {
      count += 1;
    }
  }
  return count;
}

/**
 * Проверяет, что все вопросы заполнены.
 */
export function isSpecialistScreeningComplete(answers: SpecialistScreeningAnswers): boolean {
  return countSpecialistScreeningAnswered(answers) >= SPECIALIST_SCREENING_QUESTION_COUNT;
}

/**
 * Приводит сырое значение к допустимому варианту шкалы вопроса.
 */
export function coerceSpecialistScreeningAnswer(
  question: SpecialistScreeningQuestion,
  raw: unknown
): SpecialistScreeningOptionId | null {
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return null;
  }
  const max = question.scale === "asrs" ? 4 : 3;
  if (raw < 0 || raw > max) {
    return null;
  }
  return raw as SpecialistScreeningOptionId;
}

/**
 * Возвращает вопросы одной секции.
 */
export function listSpecialistScreeningSectionQuestions(
  sectionId: SpecialistScreeningSectionId
): ReadonlyArray<SpecialistScreeningQuestion> {
  return SPECIALIST_SCREENING_QUESTIONS.filter((question) => question.sectionId === sectionId);
}
