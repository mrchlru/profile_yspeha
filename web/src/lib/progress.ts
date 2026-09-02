import { GERCHIKOV_SCREENING_QUESTION_COUNT } from "@/lib/gerchikov/step2Types";
import { getGerchikovStep2AnsweredCount } from "@/lib/gerchikov/validation";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import {
  STEP4_QUESTION_UNITS,
  STEP4_REQUIRED_PERSONAL_KEYS,
} from "@/lib/step4/step4Types";
import { Step1Data, Step2Data, Step3Data, Step4Data } from "@/store/useFormStore";

/**
 * Прогресс-бар: КОТ (50) + Герчиков (16) + Ликерт (10) + Step4 (обязательные поля).
 */
export const TOTAL_QUESTIONS_COUNT =
  KOT_STEP_QUESTION_COUNT + GERCHIKOV_SCREENING_QUESTION_COUNT + 10 + STEP4_QUESTION_UNITS;

/**
 * Считает заполненные ячейки КОТ для прогресс-бара.
 * После «Далее» / тайм-аута пропуски фиксируются пустой строкой (`finalizeKotStep1AfterTimeout`);
 * такой слот уже «закрыт» и входит в 50/50, иначе шкала не заполняется к концу прохождения.
 */
export function getStep1AnsweredCount(data: Step1Data): number {
  let n = 0;
  for (let i = 1; i <= KOT_STEP_QUESTION_COUNT; i += 1) {
    const key = `q${String(i)}` as keyof Step1Data;
    const v = data[key];
    if (v !== null && v !== undefined) {
      n += 1;
    }
  }
  return n;
}

export function getStep2AnsweredCount(data: Step2Data): number {
  return getGerchikovStep2AnsweredCount(data);
}

export function getStep3AnsweredCount(data: Step3Data): number {
  const values = [
    data.q1,
    data.q2,
    data.q3,
    data.q4,
    data.q5,
    data.q6,
    data.q7,
    data.q8,
    data.q9,
    data.q10,
  ];
  return values.filter(Boolean).length;
}

export function getStep4AnsweredCount(data: Step4Data): number {
  let n = 0;
  for (const key of STEP4_REQUIRED_PERSONAL_KEYS) {
    if (String(data.personal[key]).trim().length > 0) {
      n += 1;
    }
  }
  if (data.educationLevel.trim().length > 0) {
    n += 1;
  }
  const firstEdu = data.educationEntries[0];
  if (firstEdu && firstEdu.institution.trim().length > 0) {
    n += 1;
  }
  if (data.currentWork.organization.trim().length > 0) {
    n += 1;
  }
  if (data.currentWork.position.trim().length > 0) {
    n += 1;
  }
  return n;
}

export function getAllAnsweredCount(
  step1Data: Step1Data,
  step2Data: Step2Data,
  step3Data: Step3Data,
  step4Data: Step4Data
): number {
  return (
    getStep1AnsweredCount(step1Data) +
    getStep2AnsweredCount(step2Data) +
    getStep3AnsweredCount(step3Data) +
    getStep4AnsweredCount(step4Data)
  );
}

/**
 * Профиль готов к тесту: имя, согласие и зафиксированное время согласия (юридический учёт).
 */
export function isProfileReady(
  profileName: string,
  personalDataConsent: boolean,
  consentRecordedAt: string | null
): boolean {
  return (
    profileName.trim().length > 0 &&
    personalDataConsent &&
    consentRecordedAt !== null &&
    consentRecordedAt.trim().length > 0
  );
}

