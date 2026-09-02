import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";
import { isGerchikovStep2Complete } from "@/lib/gerchikov/validation";
import { STEP4_REQUIRED_PERSONAL_KEYS } from "@/lib/step4/step4Types";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
} from "@/store/useFormStore";

export function isStep1Complete(data: Step1Data): boolean {
  for (let i = 1; i <= KOT_STEP_QUESTION_COUNT; i += 1) {
    const key = `q${String(i)}` as keyof Step1Data;
    const v = data[key];
    if (v === null || v === undefined) {
      return false;
    }
  }
  return true;
}

export function isStep3Complete(data: Step3Data): boolean {
  return Boolean(
    data.q1 &&
      data.q2 &&
      data.q3 &&
      data.q4 &&
      data.q5 &&
      data.q6 &&
      data.q7 &&
      data.q8 &&
      data.q9 &&
      data.q10
  );
}

export function isStep4Complete(data: Step4Data): boolean {
  for (const key of STEP4_REQUIRED_PERSONAL_KEYS) {
    if (String(data.personal[key]).trim().length === 0) {
      return false;
    }
  }
  if (data.educationLevel.trim().length === 0) {
    return false;
  }
  const firstEdu = data.educationEntries[0];
  if (!firstEdu || firstEdu.institution.trim().length === 0) {
    return false;
  }
  if (
    data.currentWork.organization.trim().length === 0 ||
    data.currentWork.position.trim().length === 0
  ) {
    return false;
  }
  return true;
}

/** DOM-id секции анкеты для прокрутки и подсветки первого незаполненного блока. */
export const STEP4_REQUIRED_SECTION_DOM_IDS = {
  personal: "step4-section-personal",
  education: "step4-section-education",
  currentWork: "step4-section-current-work",
} as const;

export type Step4RequiredSectionDomId =
  (typeof STEP4_REQUIRED_SECTION_DOM_IDS)[keyof typeof STEP4_REQUIRED_SECTION_DOM_IDS];

/**
 * Возвращает id первой секции шага 4, где не выполнены обязательные поля
 * (в том же порядке, что и isStep4Complete), либо null если анкета полна.
 */
export function getFirstIncompleteStep4SectionDomId(
  data: Step4Data
): Step4RequiredSectionDomId | null {
  if (isStep4Complete(data)) {
    return null;
  }
  for (const key of STEP4_REQUIRED_PERSONAL_KEYS) {
    if (String(data.personal[key]).trim().length === 0) {
      return STEP4_REQUIRED_SECTION_DOM_IDS.personal;
    }
  }
  if (data.educationLevel.trim().length === 0) {
    return STEP4_REQUIRED_SECTION_DOM_IDS.education;
  }
  const firstEdu = data.educationEntries[0];
  if (!firstEdu || firstEdu.institution.trim().length === 0) {
    return STEP4_REQUIRED_SECTION_DOM_IDS.education;
  }
  if (
    data.currentWork.organization.trim().length === 0 ||
    data.currentWork.position.trim().length === 0
  ) {
    return STEP4_REQUIRED_SECTION_DOM_IDS.currentWork;
  }
  return null;
}

/**
 * Все шаги заполнены по правилам UI — можно отправлять на сервер.
 */
export function isFullScreeningPayloadComplete(
  step1: Step1Data,
  step2: Step2Data,
  step3: Step3Data,
  step4: Step4Data
): boolean {
  return (
    isStep1Complete(step1) &&
    isGerchikovStep2Complete(step2) &&
    isStep3Complete(step3) &&
    isStep4Complete(step4)
  );
}
