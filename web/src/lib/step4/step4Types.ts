/**
 * Типы и константы расширенной анкеты Step 4.
 *
 * Структура сделана плоско: один объект Step4Data со вложенными массивами,
 * чтобы persist (zustand/storage) сохранялся без миграций SQL — поле
 * step4Data хранится как JSON-колонка в БД.
 */

export const STEP4_MAX_EDUCATION_ENTRIES = 3 as const;
export const STEP4_MAX_COURSES = 5 as const;
export const STEP4_MAX_PREVIOUS_WORK = 2 as const;
export const STEP4_MAX_CONFERENCES = 5 as const;
export const STEP4_MAX_LITERATURE = 5 as const;
export const STEP4_MAX_LANGUAGES = 5 as const;
export const STEP4_MAX_SOCIAL_MEDIA = 5 as const;
export const STEP4_MAX_ONLINE_GAMES = 5 as const;
export const STEP4_MAX_SPECIAL_EXPERIENCE = 8 as const;

/** Личные данные кандидата (раздел «Анкетные данные», шапка анкеты). */
export type Step4Personal = {
  lastName: string;
  firstName: string;
  middleName: string;
  /** Пол: пустая строка означает «не указан». */
  gender: "" | "male" | "female";
  /** ISO дата YYYY-MM-DD; в UI собирается из день/месяц/год. */
  birthDate: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  citizenship: string;
  nationality: string;
  maritalStatus: string;
  address: string;
  /** Адрес проживания относительно места работы (в этом же городе и т.д.). */
  workCommute: string;
  travelTime: string;
  religiousRequirements: string;
  housingOwnership: string;
  hasElderlyParents: "" | "yes" | "no";
  dependentsCount: string;
  dependentsDescription: string;
  childrenCount: string;
  /** Свободная строка с датами рождения детей (через запятую). */
  childrenBirthDates: string;
  hasCriminalRecord: "" | "yes" | "no";
  badHabits: string;
  /** Доход в месяц, строкой — можно цифрами с разделителями. */
  currentIncome: string;
  desiredIncome: string;
  /** Размер кредитов в среднемесячных зарплатах. */
  creditSalaries: string;
  companyCreditSalaries: string;
};

/** Одно учебное заведение (до STEP4_MAX_EDUCATION_ENTRIES записей). */
export type Step4EducationEntry = {
  yearStart: string;
  yearEnd: string;
  institution: string;
  specialty: string;
};

/** Курс/переподготовка/сертификат (до STEP4_MAX_COURSES). */
export type Step4CourseEntry = {
  /** Сроки обучения в свободной форме (напр. «сентябрь 2023 — март 2024»). */
  period: string;
  duration: string;
  institutionAndCourse: string;
  /** Кто оплачивал: «я», «работодатель», «иное». */
  paidBy: string;
  /** Документ: «диплом», «сертификат», «нет». */
  document: string;
};

/** Опыт работы (текущее или предыдущее место). */
export type Step4WorkPlace = {
  organization: string;
  city: string;
  field: string;
  position: string;
  positionLevel: string;
  /** Дата начала, формат YYYY-MM (UI). */
  startDate: string;
  /** Дата окончания; пусто = «по настоящее время». */
  endDate: string;
  matchesEducation: "" | "yes" | "no";
  subordinates: string;
  totalEmployees: string;
  duties: string;
  achievements: string;
  /** Причина окончания работы (для предыдущих мест). */
  leaveReason: string;
};

/** Специальный опыт по направлениям. */
export type Step4SpecialExperienceEntry = {
  direction: string;
  role: string;
  withinProject: string;
  duration: string;
  organization: string;
};

export type Step4ConferenceEntry = {
  name: string;
  place: string;
  date: string;
};

export type Step4LiteratureEntry = {
  title: string;
  author: string;
  date: string;
};

export type Step4LanguageEntry = {
  language: string;
  level: string;
};

export type Step4SocialMediaEntry = {
  network: string;
  identifier: string;
};

export type Step4OnlineGameEntry = {
  name: string;
  identifier: string;
};

/** Расширенная анкета Step 4. */
export type Step4Data = {
  personal: Step4Personal;
  /** Уровень образования (выпадающий список — «высшее (очное)» и т.п.). */
  educationLevel: string;
  /** Дополнительное образование (МВА, второе высшее и т.п.). */
  additionalEducation: string;
  educationEntries: Step4EducationEntry[];
  courses: Step4CourseEntry[];
  specialExperience: Step4SpecialExperienceEntry[];
  conferences: Step4ConferenceEntry[];
  literature: Step4LiteratureEntry[];
  languages: Step4LanguageEntry[];
  currentWork: Step4WorkPlace;
  previousWork: Step4WorkPlace[];
  socialMedia: Step4SocialMediaEntry[];
  onlineGames: Step4OnlineGameEntry[];
};

export function createEmptyPersonal(): Step4Personal {
  return {
    lastName: "",
    firstName: "",
    middleName: "",
    gender: "",
    birthDate: "",
    email: "",
    phone: "",
    country: "",
    region: "",
    citizenship: "",
    nationality: "",
    maritalStatus: "",
    address: "",
    workCommute: "",
    travelTime: "",
    religiousRequirements: "",
    housingOwnership: "",
    hasElderlyParents: "",
    dependentsCount: "",
    dependentsDescription: "",
    childrenCount: "",
    childrenBirthDates: "",
    hasCriminalRecord: "",
    badHabits: "",
    currentIncome: "",
    desiredIncome: "",
    creditSalaries: "",
    companyCreditSalaries: "",
  };
}

export function createEmptyEducationEntry(): Step4EducationEntry {
  return { yearStart: "", yearEnd: "", institution: "", specialty: "" };
}

export function createEmptyCourseEntry(): Step4CourseEntry {
  return {
    period: "",
    duration: "",
    institutionAndCourse: "",
    paidBy: "",
    document: "",
  };
}

export function createEmptyWorkPlace(): Step4WorkPlace {
  return {
    organization: "",
    city: "",
    field: "",
    position: "",
    positionLevel: "",
    startDate: "",
    endDate: "",
    matchesEducation: "",
    subordinates: "",
    totalEmployees: "",
    duties: "",
    achievements: "",
    leaveReason: "",
  };
}

export function createEmptySpecialExperience(): Step4SpecialExperienceEntry {
  return {
    direction: "",
    role: "",
    withinProject: "",
    duration: "",
    organization: "",
  };
}

export function createEmptyConferenceEntry(): Step4ConferenceEntry {
  return { name: "", place: "", date: "" };
}

export function createEmptyLiteratureEntry(): Step4LiteratureEntry {
  return { title: "", author: "", date: "" };
}

export function createEmptyLanguageEntry(): Step4LanguageEntry {
  return { language: "", level: "" };
}

export function createEmptySocialMedia(): Step4SocialMediaEntry {
  return { network: "", identifier: "" };
}

export function createEmptyOnlineGame(): Step4OnlineGameEntry {
  return { name: "", identifier: "" };
}

export function createEmptyStep4Data(): Step4Data {
  return {
    personal: createEmptyPersonal(),
    educationLevel: "",
    additionalEducation: "",
    educationEntries: [createEmptyEducationEntry()],
    courses: [],
    specialExperience: [],
    conferences: [],
    literature: [],
    languages: [],
    currentWork: createEmptyWorkPlace(),
    previousWork: [],
    socialMedia: [],
    onlineGames: [],
  };
}

/**
 * Минимально необходимые поля для прохождения теста (всё остальное опционально).
 *
 * Без них HR не сможет идентифицировать кандидата и связаться с ним.
 */
export const STEP4_REQUIRED_PERSONAL_KEYS: ReadonlyArray<keyof Step4Personal> = [
  "lastName",
  "firstName",
  "birthDate",
  "email",
  "phone",
  "region",
  "citizenship",
  "maritalStatus",
];

/** Число «вопросов» в шаге 4 для прогресс-бара. */
export const STEP4_QUESTION_UNITS =
  STEP4_REQUIRED_PERSONAL_KEYS.length +
  // educationLevel + хотя бы одна запись об образовании + текущее место работы (организация + должность)
  4;
