/**
 * Одноразовая полная отправка анкеты на прод (как заполненный UI).
 *
 * Использование:
 *   SCREENING_ACCESS_CODE=... npx tsx scripts/fullSubmitProduction.ts
 *   npx tsx scripts/fullSubmitProduction.ts КОД_СКРИНИНГА
 *
 * Опционально: SUBMIT_BASE=http://localhost:3000 для локального API.
 */
import { randomUUID } from "node:crypto";

import { generateGerchikovAnswers, makeRng } from "./autoFillAudit";

const BASE = (process.env.SUBMIT_BASE || "https://prolific-stillness-production-11ee.up.railway.app").replace(
  /\/$/,
  ""
);

const step1Data = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => [`q${i + 1}`, "1"])
);

const step2Data = generateGerchikovAnswers(makeRng(42));

const step3Data = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, "fully_agree"])
);

const step4Data = {
  personal: {
    lastName: "Автотестов",
    firstName: "Иван",
    middleName: "Иванович",
    gender: "male",
    birthDate: "1990-05-15",
    email: "autotest@example.com",
    phone: "+7 (900) 000-00-00",
    country: "Россия",
    region: "Нижегородская область",
    citizenship: "РФ",
    nationality: "Русский",
    maritalStatus: "married",
    address: "г. Нижний Новгород, ул. Тестовая, д. 1",
    workCommute: "same_city",
    travelTime: "<30",
    religiousRequirements: "none",
    housingOwnership: "owned",
    hasElderlyParents: "no",
    dependentsCount: "1",
    dependentsDescription: "Ребёнок",
    childrenCount: "1",
    childrenBirthDates: "2019-08-11",
    hasCriminalRecord: "no",
    badHabits: "none",
    currentIncome: "150000",
    desiredIncome: "250000",
    creditSalaries: "0",
    companyCreditSalaries: "0",
  },
  educationLevel: "higher_full_time",
  additionalEducation: "mba",
  educationEntries: [
    {
      yearStart: "2004",
      yearEnd: "2009",
      institution: "ННГУ им. Лобачевского",
      specialty: "Психолог. Общая психология.",
    },
  ],
  courses: [
    {
      period: "сентябрь 2023 — март 2024",
      duration: "6 месяцев",
      institutionAndCourse: "Научный автономный некоммерческий институт. Курс «Управление».",
      paidBy: "self",
      document: "diploma",
    },
  ],
  specialExperience: [
    {
      direction: "Моделирование (описание), модификация (реинжиниринг) бизнес-процессов",
      role: "руководитель",
      withinProject: "да",
      duration: "более 1 года",
      organization: "ООО \"Тест\"",
    },
  ],
  conferences: [],
  literature: [
    { title: "Управление жизненным циклом компании", author: "Адизес", date: "2025" },
  ],
  languages: [{ language: "английский", level: "beginner" }],
  currentWork: {
    organization: "Ресторанный холдинг",
    city: "Нижний Новгород",
    field: "services",
    position: "Директор по персоналу",
    positionLevel: "top_manager",
    startDate: "2024-05",
    endDate: "",
    matchesEducation: "yes",
    subordinates: "8",
    totalEmployees: "2400",
    duties: "Подбор, мотивация, стимуляция, ЗП сотрудников, удержание",
    achievements: "Выстроил процесс адаптации, снизил текучку на 20%",
    leaveReason: "",
  },
  previousWork: [],
  socialMedia: [
    { network: "ВКонтакте", identifier: "https://vk.com/test" },
  ],
  onlineGames: [],
};

const accessCode =
  process.env.SCREENING_ACCESS_CODE?.trim() || process.argv[2]?.trim() || "";
if (!accessCode || accessCode.length < 8) {
  console.error(
    "Укажите код скрининга: SCREENING_ACCESS_CODE=... или npx tsx scripts/fullSubmitProduction.ts <КОД>"
  );
  process.exit(1);
}

const body = {
  sessionId: randomUUID(),
  accessCode,
  profileName: "Автотест интерпретации",
  personalDataConsent: true,
  consentRecordedAt: new Date().toISOString(),
  step1Data,
  step2Data,
  step3Data,
  step4Data,
};

const res = await fetch(`${BASE}/api/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
console.log("sessionId", body.sessionId);
