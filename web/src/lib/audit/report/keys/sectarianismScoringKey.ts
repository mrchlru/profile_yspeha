/** Идентификатор профиля деструктивной группы в ключе теста на сектантство. */
export type SectarianismProfileId =
  | "jehovah_witnesses"
  | "scientology"
  | "hizb_ut_tahrir_wahhabism"
  | "herbalife"
  | "deir"
  | "new_acropolis";

/** Одна контрольная пара «вопрос — вариант» с весом в процентах. */
export type SectarianismKeyEntry = {
  questionIndex: number;
  /** Идентификатор варианта в step-26: a | b | v | g | d. */
  optionId: string;
  weightPercent: number;
};

export type SectarianismProfileKey = {
  id: SectarianismProfileId;
  /** Заголовок в отчёте HR. */
  displayName: string;
  entries: ReadonlyArray<SectarianismKeyEntry>;
};

/** Порог суммы весов совпавших ответов для вывода о принадлежности к группе. */
export const SECTARIANISM_DETECTION_THRESHOLD_PERCENT = 70;

/** Вывод HR- и краткого отчёта, если ни один профиль не достиг порога. */
export const SECTARIANISM_CLEAR_CONCLUSION = "Причастность к сектам не выявлена";

/**
 * Ключ из документа «Секты. Ключ к тесту. Рабочий вариант.docx».
 * Буквы А/Б/В/Г/Д сопоставлены с id вариантов a/b/v/g/d.
 */
export const SECTARIANISM_PROFILE_KEYS: ReadonlyArray<SectarianismProfileKey> = [
  {
    id: "jehovah_witnesses",
    displayName: "Свидетели Иеговы",
    entries: [
      { questionIndex: 1, optionId: "v", weightPercent: 11 },
      { questionIndex: 4, optionId: "g", weightPercent: 15 },
      { questionIndex: 10, optionId: "g", weightPercent: 11 },
      { questionIndex: 14, optionId: "g", weightPercent: 11 },
      { questionIndex: 17, optionId: "v", weightPercent: 11 },
      { questionIndex: 26, optionId: "v", weightPercent: 11 },
      { questionIndex: 30, optionId: "g", weightPercent: 15 },
      { questionIndex: 32, optionId: "b", weightPercent: 15 },
    ],
  },
  {
    id: "herbalife",
    displayName: "Гербалайф",
    entries: [
      { questionIndex: 9, optionId: "a", weightPercent: 70 },
      { questionIndex: 24, optionId: "v", weightPercent: 15 },
      { questionIndex: 31, optionId: "g", weightPercent: 15 },
    ],
  },
  {
    id: "scientology",
    displayName: "Саентология (Дианетика)",
    entries: [
      { questionIndex: 7, optionId: "v", weightPercent: 10 },
      { questionIndex: 15, optionId: "v", weightPercent: 10 },
      { questionIndex: 20, optionId: "b", weightPercent: 15 },
      { questionIndex: 21, optionId: "v", weightPercent: 15 },
      { questionIndex: 23, optionId: "v", weightPercent: 15 },
      { questionIndex: 25, optionId: "v", weightPercent: 15 },
      { questionIndex: 29, optionId: "v", weightPercent: 10 },
      { questionIndex: 35, optionId: "b", weightPercent: 10 },
    ],
  },
  {
    id: "deir",
    displayName: "ДЭИР",
    entries: [
      { questionIndex: 3, optionId: "v", weightPercent: 14 },
      { questionIndex: 11, optionId: "v", weightPercent: 8 },
      { questionIndex: 13, optionId: "v", weightPercent: 19 },
      { questionIndex: 19, optionId: "b", weightPercent: 19 },
      { questionIndex: 22, optionId: "b", weightPercent: 14 },
      { questionIndex: 27, optionId: "v", weightPercent: 18 },
      { questionIndex: 34, optionId: "b", weightPercent: 8 },
    ],
  },
  {
    id: "hizb_ut_tahrir_wahhabism",
    displayName: "Хизб Ут-Тахрир и Ваххабизм",
    entries: [
      { questionIndex: 5, optionId: "b", weightPercent: 8 },
      { questionIndex: 8, optionId: "g", weightPercent: 13 },
      { questionIndex: 12, optionId: "v", weightPercent: 11 },
      { questionIndex: 18, optionId: "b", weightPercent: 15 },
      { questionIndex: 28, optionId: "v", weightPercent: 11 },
      { questionIndex: 33, optionId: "v", weightPercent: 8 },
      { questionIndex: 36, optionId: "b", weightPercent: 13 },
      { questionIndex: 37, optionId: "b", weightPercent: 8 },
      { questionIndex: 38, optionId: "g", weightPercent: 13 },
    ],
  },
  {
    id: "new_acropolis",
    displayName: "Новый Акрополь",
    entries: [
      { questionIndex: 2, optionId: "g", weightPercent: 30 },
      { questionIndex: 6, optionId: "a", weightPercent: 10 },
      { questionIndex: 16, optionId: "b", weightPercent: 60 },
    ],
  },
];
