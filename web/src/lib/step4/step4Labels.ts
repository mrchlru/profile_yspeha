import type { Step4Data } from "@/lib/step4/step4Types";
import { buildEducationLearningConclusionText } from "@/lib/step4/computeEducationLearningConclusion";

/** Универсальная пара значение-метка для select-полей. */
export type Step4Option = { value: string; label: string };

export const STEP4_FAMILY_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "single", label: "Холост/Не замужем" },
  { value: "married", label: "Женат/Замужем" },
  { value: "partner", label: "В гражданском браке" },
  { value: "divorced", label: "Разведён/Разведена" },
  { value: "widowed", label: "Вдовец/Вдова" },
  { value: "prefer_not", label: "Предпочитаю не отвечать" },
];

export const STEP4_EDUCATION_LEVEL_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "secondary", label: "Среднее" },
  { value: "secondary_special", label: "Среднее специальное" },
  { value: "higher_full_time", label: "Высшее (очное)" },
  { value: "higher_part_time", label: "Высшее (заочное)" },
  { value: "second_higher", label: "Второе высшее" },
  { value: "postgraduate", label: "Магистратура/Аспирантура" },
  { value: "other", label: "Другое" },
];

export const STEP4_ADDITIONAL_EDUCATION_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "none", label: "Нет" },
  { value: "mba", label: "Курсы MBA" },
  { value: "professional_retraining", label: "Профессиональная переподготовка" },
  { value: "qualification", label: "Курсы повышения квалификации" },
  { value: "other", label: "Другое" },
];

export const STEP4_WORK_COMMUTE_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "same_city", label: "В этом же городе" },
  { value: "neighboring_city", label: "В соседнем городе" },
  { value: "other_region", label: "В другом регионе" },
  { value: "remote", label: "Удалённо" },
];

export const STEP4_TRAVEL_TIME_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "<30", label: "До 30 минут" },
  { value: "30-60", label: "30–60 минут" },
  { value: "60-90", label: "1–1,5 часа" },
  { value: ">90", label: "Более 1,5 часов" },
];

export const STEP4_RELIGIOUS_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "none", label: "Не придерживаюсь" },
  { value: "moderate", label: "Соблюдаю частично" },
  { value: "strict", label: "Обязательно выполняю все религиозные требования" },
];

export const STEP4_HOUSING_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "owned", label: "В собственности" },
  { value: "mortgage", label: "В ипотеке" },
  { value: "rent", label: "Съёмное" },
  { value: "relatives", label: "У родственников" },
  { value: "service", label: "Служебное" },
];

export const STEP4_BAD_HABITS_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "none", label: "Нет" },
  { value: "smoking", label: "Курение" },
  { value: "alcohol", label: "Алкоголь" },
  { value: "smoking_alcohol", label: "Курение + алкоголь" },
  { value: "other", label: "Иное" },
];

export const STEP4_POSITION_LEVEL_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "specialist", label: "Специалист" },
  { value: "line_manager", label: "Линейный руководитель" },
  { value: "mid_manager", label: "Менеджер среднего звена" },
  { value: "top_manager", label: "Топ-менеджер" },
  { value: "owner", label: "Владелец/Учредитель" },
];

export const STEP4_FIELD_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "services", label: "Сфера услуг" },
  { value: "production", label: "Производство" },
  { value: "retail", label: "Розничная торговля" },
  { value: "wholesale", label: "Оптовая торговля" },
  { value: "it", label: "ИТ/Технологии" },
  { value: "finance", label: "Финансы и банки" },
  { value: "construction", label: "Строительство" },
  { value: "logistics", label: "Логистика и транспорт" },
  { value: "education", label: "Образование" },
  { value: "healthcare", label: "Медицина" },
  { value: "government", label: "Государственная сфера" },
  { value: "municipal", label: "Муниципальная сфера" },
  { value: "other", label: "Другое" },
];

export const STEP4_LANGUAGE_LEVEL_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "beginner", label: "Начальный уровень" },
  { value: "intermediate", label: "Средний уровень" },
  { value: "advanced", label: "Продвинутый" },
  { value: "fluent", label: "Свободное владение" },
  { value: "native", label: "Родной" },
];

export const STEP4_PAID_BY_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "self", label: "Я" },
  { value: "employer", label: "Работодатель" },
  { value: "mixed", label: "Совместно" },
  { value: "other", label: "Иное" },
];

export const STEP4_COURSE_DOCUMENT_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "diploma", label: "Диплом" },
  { value: "certificate", label: "Сертификат" },
  { value: "none", label: "Нет" },
];

export const STEP4_SPECIAL_EXPERIENCE_ROLE_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "leader", label: "Руководитель" },
  { value: "executor", label: "Исполнитель" },
  { value: "consultant", label: "Консультант / эксперт" },
  { value: "observer", label: "Наблюдатель" },
];

export const STEP4_SPECIAL_EXPERIENCE_WITHIN_PROJECT_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "yes", label: "Да" },
  { value: "no", label: "Нет" },
];

export const STEP4_SPECIAL_EXPERIENCE_DURATION_OPTIONS: ReadonlyArray<Step4Option> = [
  { value: "lt_3m", label: "До 3 месяцев" },
  { value: "lt_1y", label: "Менее 1 года" },
  { value: "1_3y", label: "1–3 года" },
  { value: "gt_3y", label: "Более 3 лет" },
];

export function lookupLabel(
  options: ReadonlyArray<Step4Option>,
  value: string
): string {
  if (!value || value.trim().length === 0) {
    return "";
  }
  const found = options.find((opt) => opt.value === value);
  return found ? found.label : value;
}

function yn(value: "" | "yes" | "no"): string {
  if (value === "yes") {
    return "Да";
  }
  if (value === "no") {
    return "Нет";
  }
  return "";
}

function gender(value: "" | "male" | "female"): string {
  if (value === "male") {
    return "Мужской";
  }
  if (value === "female") {
    return "Женский";
  }
  return "";
}

/** Раздел с парами «ключ-значение» для PDF/AI. */
export type Step4ReportSection = {
  title: string;
  rows: Array<{ key: string; value: string }>;
  groups?: Array<{ heading: string; rows: Array<{ key: string; value: string }> }>;
};

function dash(value: string): string {
  return value.trim().length > 0 ? value : "—";
}

function nonEmptyRow(key: string, value: string): { key: string; value: string } | null {
  if (value.trim().length === 0) {
    return null;
  }
  return { key, value };
}

/**
 * Собирает раздел «Личные данные» только из заполненных полей.
 *
 * Незаполненные пропускаются, чтобы не плодить «—» в отчёте.
 */
function buildPersonalSection(data: Step4Data): Step4ReportSection {
  const p = data.personal;
  const fullName = [p.lastName, p.firstName, p.middleName]
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .join(" ");
  const rows: Array<{ key: string; value: string } | null> = [
    nonEmptyRow("ФИО", fullName),
    nonEmptyRow("Пол", gender(p.gender)),
    nonEmptyRow("Дата рождения", p.birthDate),
    nonEmptyRow("E-mail", p.email),
    nonEmptyRow("Телефон", p.phone),
    nonEmptyRow("Страна проживания", p.country),
    nonEmptyRow("Регион проживания", p.region),
    nonEmptyRow("Гражданство", p.citizenship),
    nonEmptyRow("Национальность", p.nationality),
    nonEmptyRow("Семейное положение", lookupLabel(STEP4_FAMILY_OPTIONS, p.maritalStatus)),
    nonEmptyRow("Адрес проживания", p.address),
    nonEmptyRow("Адрес относительно работы", lookupLabel(STEP4_WORK_COMMUTE_OPTIONS, p.workCommute)),
    nonEmptyRow("Время в дороге", lookupLabel(STEP4_TRAVEL_TIME_OPTIONS, p.travelTime)),
    nonEmptyRow("Религиозные требования", lookupLabel(STEP4_RELIGIOUS_OPTIONS, p.religiousRequirements)),
    nonEmptyRow("Право собственности на жильё", lookupLabel(STEP4_HOUSING_OPTIONS, p.housingOwnership)),
    nonEmptyRow("Есть пожилые родители на попечении", yn(p.hasElderlyParents)),
    nonEmptyRow("Число иждивенцев", p.dependentsCount),
    nonEmptyRow("Кто находится на обеспечении", p.dependentsDescription),
    nonEmptyRow("Число детей", p.childrenCount),
    nonEmptyRow("Даты рождения детей", p.childrenBirthDates),
    nonEmptyRow("Судимость", yn(p.hasCriminalRecord)),
    nonEmptyRow("Вредные привычки", lookupLabel(STEP4_BAD_HABITS_OPTIONS, p.badHabits)),
    nonEmptyRow("Текущий доход (в месяц)", p.currentIncome),
    nonEmptyRow("Желаемый доход (в месяц)", p.desiredIncome),
    nonEmptyRow("Кредиты (среднемес. зарплат)", p.creditSalaries),
    nonEmptyRow("Кредиты у компании (зарплат)", p.companyCreditSalaries),
  ];
  return {
    title: "Личные данные",
    rows: rows.filter((r): r is { key: string; value: string } => r !== null),
  };
}

function buildEducationSection(data: Step4Data): Step4ReportSection {
  const rows: Array<{ key: string; value: string }> = [];
  if (data.educationLevel.trim().length > 0) {
    rows.push({
      key: "Уровень образования",
      value: lookupLabel(STEP4_EDUCATION_LEVEL_OPTIONS, data.educationLevel),
    });
  }
  if (data.additionalEducation.trim().length > 0) {
    rows.push({
      key: "Дополнительное образование",
      value: lookupLabel(STEP4_ADDITIONAL_EDUCATION_OPTIONS, data.additionalEducation),
    });
  }
  const groups = data.educationEntries
    .map((e, i) => ({
      heading: `Учебное заведение №${String(i + 1)}`,
      rows: [
        nonEmptyRow("Годы обучения", `${e.yearStart} — ${e.yearEnd}`.replace(/^ — $/, "")),
        nonEmptyRow("Название", e.institution),
        nonEmptyRow("Специальность", e.specialty),
      ].filter((r): r is { key: string; value: string } => r !== null),
    }))
    .filter((g) => g.rows.length > 0);
  return { title: "Образование", rows, groups };
}

function buildCoursesSection(data: Step4Data): Step4ReportSection {
  const groups = data.courses
    .map((c, i) => ({
      heading: `Курс/сертификат №${String(i + 1)}`,
      rows: [
        nonEmptyRow("Сроки обучения", c.period),
        nonEmptyRow("Длительность", c.duration),
        nonEmptyRow("Учебное заведение и курс", c.institutionAndCourse),
        nonEmptyRow("Оплачивал", lookupLabel(STEP4_PAID_BY_OPTIONS, c.paidBy)),
        nonEmptyRow(
          "Документ",
          lookupLabel(STEP4_COURSE_DOCUMENT_OPTIONS, c.document)
        ),
      ].filter((r): r is { key: string; value: string } => r !== null),
    }))
    .filter((g) => g.rows.length > 0);
  return { title: "Курсы переподготовки и повышения квалификации", rows: [], groups };
}

function buildEducationLearningConclusionSection(data: Step4Data): Step4ReportSection | null {
  const conclusion = buildEducationLearningConclusionText(data);
  if (conclusion.trim().length === 0) {
    return null;
  }
  return {
    title: "Заключение по образованию и обучению",
    rows: [{ key: "Вывод", value: conclusion }],
  };
}

function buildWorkPlaceRows(w: {
  organization: string;
  city: string;
  field: string;
  position: string;
  positionLevel: string;
  startDate: string;
  endDate: string;
  matchesEducation: "" | "yes" | "no";
  subordinates: string;
  totalEmployees: string;
  duties: string;
  achievements: string;
  leaveReason: string;
}): Array<{ key: string; value: string }> {
  return [
    nonEmptyRow("Организация", w.organization),
    nonEmptyRow("Город", w.city),
    nonEmptyRow("Сфера", lookupLabel(STEP4_FIELD_OPTIONS, w.field)),
    nonEmptyRow("Должность", w.position),
    nonEmptyRow(
      "Уровень должности",
      lookupLabel(STEP4_POSITION_LEVEL_OPTIONS, w.positionLevel)
    ),
    nonEmptyRow("Дата начала", w.startDate),
    nonEmptyRow("Дата окончания", w.endDate),
    nonEmptyRow("Совпадает с образованием", yn(w.matchesEducation)),
    nonEmptyRow("Число подчинённых", w.subordinates),
    nonEmptyRow("Общая численность", w.totalEmployees),
    nonEmptyRow("Обязанности", w.duties),
    nonEmptyRow("Достижения", w.achievements),
    nonEmptyRow("Причина окончания работ", w.leaveReason),
  ].filter((r): r is { key: string; value: string } => r !== null);
}

function buildWorkSection(data: Step4Data): Step4ReportSection {
  const groups: Array<{ heading: string; rows: Array<{ key: string; value: string }> }> = [];
  const cur = buildWorkPlaceRows(data.currentWork);
  if (cur.length > 0) {
    groups.push({ heading: "Текущее место работы", rows: cur });
  }
  data.previousWork.forEach((w, i) => {
    const rows = buildWorkPlaceRows(w);
    if (rows.length > 0) {
      groups.push({
        heading: `Предыдущее место работы №${String(i + 1)}`,
        rows,
      });
    }
  });
  return { title: "Опыт работы", rows: [], groups };
}

function buildSpecialExperienceSection(data: Step4Data): Step4ReportSection {
  const groups = data.specialExperience
    .map((e, i) => ({
      heading: e.direction.trim().length > 0 ? e.direction : `Направление №${String(i + 1)}`,
      rows: [
        nonEmptyRow("Роль", lookupLabel(STEP4_SPECIAL_EXPERIENCE_ROLE_OPTIONS, e.role)),
        nonEmptyRow(
          "В рамках проекта",
          lookupLabel(STEP4_SPECIAL_EXPERIENCE_WITHIN_PROJECT_OPTIONS, e.withinProject)
        ),
        nonEmptyRow(
          "Длительность",
          lookupLabel(STEP4_SPECIAL_EXPERIENCE_DURATION_OPTIONS, e.duration)
        ),
        nonEmptyRow("Организация", e.organization),
      ].filter((r): r is { key: string; value: string } => r !== null),
    }))
    .filter((g) => g.rows.length > 0);
  return { title: "Специальный опыт по направлениям", rows: [], groups };
}

function buildSimpleListSection(
  title: string,
  items: Array<Array<{ key: string; value: string } | null>>,
  itemName: string
): Step4ReportSection {
  const groups = items
    .map((row, i) => ({
      heading: `${itemName} №${String(i + 1)}`,
      rows: row.filter((r): r is { key: string; value: string } => r !== null),
    }))
    .filter((g) => g.rows.length > 0);
  return { title, rows: [], groups };
}

export function buildStep4ReportSections(data: Step4Data): Step4ReportSection[] {
  const educationConclusion = buildEducationLearningConclusionSection(data);
  const sections: Step4ReportSection[] = [
    buildPersonalSection(data),
    buildEducationSection(data),
    buildCoursesSection(data),
    ...(educationConclusion !== null ? [educationConclusion] : []),
    buildWorkSection(data),
    buildSpecialExperienceSection(data),
    buildSimpleListSection(
      "Выставки и конференции",
      data.conferences.map((c) => [
        nonEmptyRow("Название", c.name),
        nonEmptyRow("Место", c.place),
        nonEmptyRow("Дата", c.date),
      ]),
      "Запись"
    ),
    buildSimpleListSection(
      "Профессиональная и художественная литература",
      data.literature.map((c) => [
        nonEmptyRow("Название", c.title),
        nonEmptyRow("Автор", c.author),
        nonEmptyRow("Дата прочтения", c.date),
      ]),
      "Книга"
    ),
    buildSimpleListSection(
      "Иностранные языки",
      data.languages.map((c) => [
        nonEmptyRow("Язык", c.language),
        nonEmptyRow("Уровень", lookupLabel(STEP4_LANGUAGE_LEVEL_OPTIONS, c.level)),
      ]),
      "Язык"
    ),
    buildSimpleListSection(
      "Социальные сети",
      data.socialMedia.map((c) => [
        nonEmptyRow("Сеть", c.network),
        nonEmptyRow("Идентификатор", c.identifier),
      ]),
      "Соцсеть"
    ),
    buildSimpleListSection(
      "Онлайн-игры",
      data.onlineGames.map((c) => [
        nonEmptyRow("Игра", c.name),
        nonEmptyRow("Идентификатор", c.identifier),
      ]),
      "Игра"
    ),
  ];
  return sections.filter(
    (s) => s.rows.length > 0 || (s.groups !== undefined && s.groups.length > 0)
  );
}

/**
 * Краткий обезличенный текст для LLM (используется в AI-контексте).
 *
 * Возвращает многострочный текст в формате «Ключ: значение», без оформления.
 */
export function buildStep4AiSummary(data: Step4Data): string {
  const lines: string[] = [];
  const sections = buildStep4ReportSections(data);
  for (const s of sections) {
    lines.push(`# ${s.title}`);
    for (const r of s.rows) {
      lines.push(`${r.key}: ${dash(r.value)}`);
    }
    if (s.groups) {
      for (const g of s.groups) {
        lines.push(`-- ${g.heading} --`);
        for (const r of g.rows) {
          lines.push(`${r.key}: ${dash(r.value)}`);
        }
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}
