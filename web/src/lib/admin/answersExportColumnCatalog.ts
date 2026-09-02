import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { AUDIT_STEP_01_PAIRS } from "@/lib/audit/questions/step01Pairs";
import { AUDIT_STEP_21_QUESTIONS } from "@/lib/audit/questions/step21Gerchikov";
import { KOT_OFFICIAL_QUESTIONS_BY_KEY } from "@/lib/kot/kotOfficial50Questions";
import type { KotQuestionKey } from "@/lib/kot/step1Types";
import { REPORT_EXPORT_TEST_KIND_LABELS, type ReportExportTestKind } from "@/lib/admin/reportExportKinds";

const LIKERT_LABELS: Record<string, string> = {
  fully_agree: "Полностью согласен",
  agree: "Согласен",
  neutral: "Скорее нейтрально",
  disagree: "Скорее не согласен",
  fully_disagree: "Полностью не согласен",
};

const YES_NO_LABELS: Record<string, string> = {
  yes: "Да",
  no: "Нет",
  unknown: "Не знаю",
  true: "Верно",
  false: "Неверно",
};

const MATRIX_IMPORTANCE_LABELS: Record<string, string> = {
  very: "Очень важно",
  somewhat: "Не очень важно",
  not: "Совсем не важно",
};

const STEP3_QUESTION_TITLES: Record<string, string> = {
  q1: "Я обычно сохраняю позитивный настрой на работе.",
  q2: "Мне легко адаптироваться к изменениям.",
  q3: "Я спокойно отношусь к критике и улучшениям.",
  q4: "Я способен(на) поддерживать фокус на задачах.",
  q5: "Я умею восстанавливаться после стресса.",
  q6: "Я проявляю эмпатию к людям вокруг.",
  q7: "Я стремлюсь к ясности и понимаю приоритеты.",
  q8: "Я чувствую контроль над тем, что происходит.",
  q9: "Мне комфортно работать в команде.",
  q10: "Я избегаю конфликтов и умею их разруливать.",
};

const STEP4_FIELD_LABELS: Record<string, string> = {
  "step4.personal.lastName": "Фамилия",
  "step4.personal.firstName": "Имя",
  "step4.personal.middleName": "Отчество",
  "step4.personal.gender": "Пол",
  "step4.personal.birthDate": "Дата рождения",
  "step4.personal.email": "E-mail",
  "step4.personal.phone": "Телефон",
  "step4.personal.country": "Страна",
  "step4.personal.region": "Регион",
  "step4.personal.citizenship": "Гражданство",
  "step4.personal.nationality": "Национальность",
  "step4.personal.maritalStatus": "Семейное положение",
  "step4.personal.address": "Адрес",
  "step4.personal.workCommute": "Проживание относительно работы",
  "step4.personal.travelTime": "Время в пути",
  "step4.personal.religiousRequirements": "Религиозные требования",
  "step4.personal.housingOwnership": "Жильё",
  "step4.personal.hasElderlyParents": "Пожилые родители",
  "step4.personal.dependentsCount": "Иждивенцы (число)",
  "step4.personal.dependentsDescription": "Иждивенцы (описание)",
  "step4.personal.childrenCount": "Дети (число)",
  "step4.personal.childrenBirthDates": "Даты рождения детей",
  "step4.personal.hasCriminalRecord": "Судимость",
  "step4.personal.badHabits": "Вредные привычки",
  "step4.personal.currentIncome": "Текущий доход",
  "step4.personal.desiredIncome": "Желаемый доход",
  "step4.personal.creditSalaries": "Кредиты (зарплаты)",
  "step4.personal.companyCreditSalaries": "Кредиты компании",
  "step4.educationLevel": "Уровень образования",
  "step4.currentWork.organization": "Организация (текущая)",
  "step4.currentWork.position": "Должность (текущая)",
  "step4.currentWork.city": "Город (текущая работа)",
};

export type AnswerColumnMeta = {
  key: string;
  sortKey: string;
  sectionLabel: string;
  questionLabel: string;
  headerLabel: string;
};

const SKIPPED_ANSWER_KEYS = new Set(["assesseeKey", "accessInviteCode"]);

/**
 * Возвращает метаданные колонки ответа для табличной выгрузки.
 */
export function resolveAnswerColumnMeta(
  testKind: ReportExportTestKind,
  flatKey: string
): AnswerColumnMeta {
  const sectionLabel = _sectionLabelForKey(testKind, flatKey);
  const questionLabel = _questionLabelForKey(flatKey);
  const headerLabel = _truncate(`${sectionLabel} | ${questionLabel}`, 160);
  return {
    key: flatKey,
    sortKey: _sortKeyForFlatKey(flatKey),
    sectionLabel,
    questionLabel,
    headerLabel,
  };
}

/**
 * Сортирует ключи ответов в порядке прохождения теста.
 */
export function sortAnswerColumnKeys(keys: Iterable<string>): string[] {
  return [...keys].sort((left, right) =>
    _sortKeyForFlatKey(left).localeCompare(_sortKeyForFlatKey(right), "ru", { numeric: true })
  );
}

/**
 * Ключи, которые не попадают в колонки ответов (служебные).
 */
export function isSkippedAnswerExportKey(flatKey: string): boolean {
  const root = flatKey.split(".")[0] ?? flatKey;
  return SKIPPED_ANSWER_KEYS.has(root) || SKIPPED_ANSWER_KEYS.has(flatKey);
}

/**
 * Преобразует сырое значение ответа в читаемую строку для Excel.
 */
export function formatAnswerValueForExport(flatKey: string, rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  if (flatKey.includes(".q8[")) {
    return MATRIX_IMPORTANCE_LABELS[trimmed] ?? trimmed;
  }

  if (LIKERT_LABELS[trimmed]) {
    return LIKERT_LABELS[trimmed]!;
  }
  if (YES_NO_LABELS[trimmed]) {
    return YES_NO_LABELS[trimmed]!;
  }

  const pairChoice = _decodeAuditPairChoice(flatKey, trimmed);
  if (pairChoice) {
    return pairChoice;
  }

  if (trimmed.includes(";")) {
    return trimmed
      .split(";")
      .map((part) => formatAnswerValueForExport(flatKey, part))
      .join("; ");
  }

  return trimmed;
}

function _decodeAuditPairChoice(flatKey: string, value: string): string | null {
  const match = /^steps\.(\d+)\.(q\d+)$/.exec(flatKey);
  if (!match || (value !== "a" && value !== "b")) {
    return null;
  }
  const stepIndex = Number(match[1]);
  const questionId = match[2];
  if (stepIndex !== 1 || !questionId) {
    return null;
  }
  const pairIndex = Number(questionId.replace(/^q/, ""));
  const pair = AUDIT_STEP_01_PAIRS.find((item) => item.index === pairIndex);
  if (!pair) {
    return value === "a" ? "Вариант A" : "Вариант B";
  }
  const text = value === "a" ? pair.optionA : pair.optionB;
  return _truncate(text, 200);
}

function _sectionLabelForKey(testKind: ReportExportTestKind, flatKey: string): string {
  const testLabel = REPORT_EXPORT_TEST_KIND_LABELS[testKind];

  if (flatKey.startsWith("step1.")) {
    return `${testLabel} · КОТ`;
  }
  if (flatKey.startsWith("step2.")) {
    return `${testLabel} · Герчиков`;
  }
  if (flatKey.startsWith("step3.")) {
    return `${testLabel} · Шкала согласия`;
  }
  if (flatKey.startsWith("step4.")) {
    return `${testLabel} · Анкета`;
  }
  if (flatKey.startsWith("maslach.")) {
    return `${testLabel} · Maslach`;
  }

  const auditMatch = /^steps\.(\d+)\./.exec(flatKey);
  if (auditMatch?.[1]) {
    const stepIndex = Number(auditMatch[1]);
    const step = AUDIT_STEPS.find((item) => item.stepIndex === stepIndex);
    const stepTitle = step ? `Шаг ${String(stepIndex)}` : `Шаг ${auditMatch[1]}`;
    return `${testLabel} · ${stepTitle}`;
  }

  return testLabel;
}

function _questionLabelForKey(flatKey: string): string {
  if (STEP4_FIELD_LABELS[flatKey]) {
    return STEP4_FIELD_LABELS[flatKey]!;
  }

  const step1Match = /^step1\.(q\d+)$/.exec(flatKey);
  if (step1Match?.[1]) {
    const spec = KOT_OFFICIAL_QUESTIONS_BY_KEY[step1Match[1] as KotQuestionKey];
    if (spec) {
      return _truncate(spec.prompt, 120);
    }
    return `Вопрос ${step1Match[1]}`;
  }

  const step2Match = /^step2\.(q\d+)(?:\[(\d+)\])?$/.exec(flatKey);
  if (step2Match?.[1]) {
    const question = AUDIT_STEP_21_QUESTIONS.find((item) => item.id === step2Match[1]);
    const suffix = step2Match[2] ? ` · строка ${String(Number(step2Match[2]) + 1)}` : "";
    if (question && "prompt" in question) {
      return _truncate(`${question.prompt}${suffix}`, 120);
    }
    return `Вопрос ${step2Match[1]}${suffix}`;
  }

  const step3Match = /^step3\.(q\d+)$/.exec(flatKey);
  if (step3Match?.[1]) {
    return STEP3_QUESTION_TITLES[step3Match[1]] ?? `Вопрос ${step3Match[1]}`;
  }

  const step4Indexed = /^step4\.(\w+)\[(\d+)\]\.(\w+)$/.exec(flatKey);
  if (step4Indexed) {
    const [, group, index, field] = step4Indexed;
    const label = _step4GroupFieldLabel(group, field);
    return `${label} ${String(Number(index) + 1)}`;
  }

  const auditMatch = /^steps\.(\d+)\.(q\d+)(?:\[(\d+)\])?$/.exec(flatKey);
  if (auditMatch) {
    const stepIndex = Number(auditMatch[1]);
    const questionId = auditMatch[2] ?? "";
    const rowSuffix = auditMatch[3] ? ` · строка ${String(Number(auditMatch[3]) + 1)}` : "";

    if (stepIndex === 1) {
      const pairIndex = Number(questionId.replace(/^q/, ""));
      const pair = AUDIT_STEP_01_PAIRS.find((item) => item.index === pairIndex);
      if (pair) {
        return _truncate(`Пара ${String(pairIndex)}: ${pair.optionA} / ${pair.optionB}`, 120);
      }
    }

    if (stepIndex === 21) {
      const question = AUDIT_STEP_21_QUESTIONS.find((item) => item.id === questionId);
      if (question && "prompt" in question) {
        return _truncate(`${question.prompt}${rowSuffix}`, 120);
      }
    }

    return `Вопрос ${questionId}${rowSuffix}`;
  }

  const tail = flatKey.split(".").slice(-2).join(" · ");
  return tail || flatKey;
}

function _step4GroupFieldLabel(group: string | undefined, field: string | undefined): string {
  const labels: Record<string, Record<string, string>> = {
    educationEntries: {
      yearStart: "Образование, год начала",
      yearEnd: "Образование, год окончания",
      institution: "Образование, учреждение",
      specialty: "Образование, специальность",
    },
    courses: {
      period: "Курс, период",
      duration: "Курс, длительность",
      institutionAndCourse: "Курс, учреждение",
      paidBy: "Курс, оплата",
      document: "Курс, документ",
    },
    previousWork: {
      organization: "Пред. работа, организация",
      city: "Пред. работа, город",
      position: "Пред. работа, должность",
    },
    languages: {
      language: "Язык",
      level: "Уровень языка",
    },
  };
  if (group && field && labels[group]?.[field]) {
    return labels[group][field]!;
  }
  return `${group ?? "поле"} · ${field ?? "значение"}`;
}

function _sortKeyForFlatKey(flatKey: string): string {
  const segments: string[] = [];
  const parts = flatKey.split(".");
  for (const part of parts) {
    const arrayMatch = /^(\w+)\[(\d+)\]$/.exec(part);
    if (arrayMatch) {
      segments.push(arrayMatch[1]!.padStart(4, "0"));
      segments.push(arrayMatch[2]!.padStart(4, "0"));
      continue;
    }
    const qMatch = /^q(\d+)$/.exec(part);
    if (qMatch) {
      segments.push(`q${qMatch[1]!.padStart(4, "0")}`);
      continue;
    }
    if (/^\d+$/.test(part)) {
      segments.push(part.padStart(4, "0"));
      continue;
    }
    segments.push(part);
  }
  return segments.join(".");
}

function _truncate(value: string, maxLength: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
}
