/**
 * Локальная проверка PDF-шаблона скрининга: npx tsx scripts/previewScreeningPdf.ts
 */
import { writeFileSync } from "fs";
import path from "path";

import type { GerchikovStep2Data } from "../src/lib/gerchikov/step2Types";
import { describeKotIpLevel, KOT_IP_NORM_NOTE } from "../src/lib/kot/kotOfficial50Scoring";
import { generateScreeningPdfBuffer } from "../src/lib/report/generateScreeningPdf";
import type { Step1Data, Step3Data, Step4Data } from "../src/store/useFormStore";
import { generateGerchikovAnswers, makeRng } from "./autoFillAudit";

const step1Data = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => [`q${i + 1}`, "1"])
) as Step1Data;

const step2Data = generateGerchikovAnswers(makeRng(42)) as GerchikovStep2Data;

const step3Data = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, "fully_agree"])
) as Step3Data;

const step4Data: Step4Data = {
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
  courses: [],
  specialExperience: [],
  conferences: [],
  literature: [],
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
    duties: "Подбор, мотивация, стимуляция",
    achievements: "Снизил текучку на 20%",
    leaveReason: "",
  },
  previousWork: [],
  socialMedia: [],
  onlineGames: [],
};

async function main(): Promise<void> {
  const kotIp = 28;
  const buf = await generateScreeningPdfBuffer({
    profileName: "Автотестов Иван",
    sessionId: "preview-screening-session",
    rawScore: kotIp,
    maxScore: 50,
    kotIp,
    kotIpLevelLabel: describeKotIpLevel(kotIp),
    kotIpNormNote: KOT_IP_NORM_NOTE,
    step1: step1Data,
    step2: step2Data,
    step3: step3Data,
    step4: step4Data,
    conclusionText:
      "Кандидат демонстрирует выше среднего интеллектуальный потенциал. " +
      "Мотивация смещена в сторону материальных стимулов и профессиональной самореализации. " +
      "Эмоциональный фон стабильный, ресурсность высокая.",
    hiringRecommendations:
      "Рекомендуется пригласить на очное интервью. Уточнить ожидания по доходу и зону ответственности.",
  });

  const out = path.resolve(process.cwd(), "screening-preview.pdf");
  writeFileSync(out, buf);
  console.log(`[previewScreeningPdf] ${String(buf.length)} bytes → ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
