import { STEP4_FIELD_OPTIONS } from "@/lib/step4/step4Labels";
import { CANDIDATE_POSITION_LEVEL_OPTIONS } from "@/lib/admin/candidatePositionLevels";

export type CommissionQuestionCategoryId =
  | "finance_accounting"
  | "finance_planning"
  | "marketing"
  | "sales"
  | "management"
  | "operations"
  | "strategy"
  | "analytics_bi"
  | "soft_skills"
  | "hard_skills"
  | "communication"
  | "hr_people"
  | "legal_compliance"
  | "customer_service"
  | "production"
  | "logistics_supply"
  | "it_digital"
  | "quality_safety"
  | "industry_knowledge"
  | "project_management"
  | "entrepreneurship"
  | "other";

export type CommissionQuestionCategory = {
  id: CommissionQuestionCategoryId;
  label: string;
};

/** Категории навыков для распределения вопросов комиссии. */
export const COMMISSION_QUESTION_CATEGORIES: ReadonlyArray<CommissionQuestionCategory> = [
  { id: "finance_accounting", label: "Финансы и учёт" },
  { id: "finance_planning", label: "Финансовое планирование и P&L" },
  { id: "marketing", label: "Маркетинг" },
  { id: "sales", label: "Продажи и коммерция" },
  { id: "management", label: "Управление и лидерство" },
  { id: "operations", label: "Операционное управление" },
  { id: "strategy", label: "Стратегия и развитие" },
  { id: "analytics_bi", label: "Аналитика и BI" },
  { id: "soft_skills", label: "Софт-скиллы" },
  { id: "hard_skills", label: "Профессиональные навыки" },
  { id: "communication", label: "Коммуникации и переговоры" },
  { id: "hr_people", label: "HR и работа с командой" },
  { id: "legal_compliance", label: "Право и комплаенс" },
  { id: "customer_service", label: "Клиентский сервис" },
  { id: "production", label: "Производство" },
  { id: "logistics_supply", label: "Логистика и закупки" },
  { id: "it_digital", label: "ИТ и цифровизация" },
  { id: "quality_safety", label: "Качество и безопасность" },
  { id: "industry_knowledge", label: "Отраслевые знания" },
  { id: "project_management", label: "Управление проектами" },
  { id: "entrepreneurship", label: "Предпринимательство" },
  { id: "other", label: "Прочее" },
];

const CATEGORY_IDS = new Set(COMMISSION_QUESTION_CATEGORIES.map((item) => item.id));

/** Ролевые и отраслевые специальности для фильтрации вопросов. */
export const COMMISSION_ROLE_SPECIALTY_OPTIONS = [
  { value: "commercial", label: "Коммерция" },
  { value: "operations_director", label: "Операционный директор" },
  { value: "commercial_director", label: "Коммерческий директор" },
  { value: "financial_analyst", label: "Финансовый аналитик" },
  { value: "business_analyst", label: "Бизнес-аналитик" },
  { value: "store_manager", label: "Управляющий / директор объекта" },
  { value: "line_supervisor", label: "Линейный руководитель подразделения" },
  { value: "hr_specialist", label: "HR / кадры" },
  { value: "universal", label: "Универсальные (все специальности)" },
] as const;

export const COMMISSION_SPECIALTY_OPTIONS = [
  ...STEP4_FIELD_OPTIONS,
  ...COMMISSION_ROLE_SPECIALTY_OPTIONS,
] as const;

const SPECIALTY_VALUES = new Set(COMMISSION_SPECIALTY_OPTIONS.map((item) => item.value));
const POSITION_LEVEL_VALUES = new Set(
  CANDIDATE_POSITION_LEVEL_OPTIONS.map((item) => item.value)
);

export type CommissionQuestionRecord = {
  id: string;
  text: string;
  category: CommissionQuestionCategoryId;
  categoryLabel: string;
  positionLevels: ReadonlyArray<string>;
  positionLevelLabels: ReadonlyArray<string>;
  specialties: ReadonlyArray<string>;
  specialtyLabels: ReadonlyArray<string>;
  sortOrder: number;
  active: boolean;
  aiSuggested: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClassifiedCommissionQuestionDraft = {
  text: string;
  category: CommissionQuestionCategoryId;
  positionLevels: ReadonlyArray<string>;
  specialties: ReadonlyArray<string>;
  rationale: string | null;
};

/**
 * Возвращает подпись категории по идентификатору.
 */
export function commissionQuestionCategoryLabel(
  categoryId: string
): string {
  return (
    COMMISSION_QUESTION_CATEGORIES.find((item) => item.id === categoryId)?.label ?? categoryId
  );
}

/**
 * Возвращает подпись специальности по значению.
 */
export function commissionSpecialtyLabel(value: string): string {
  return (
    COMMISSION_SPECIALTY_OPTIONS.find((item) => item.value === value)?.label ?? value
  );
}

/**
 * Проверяет допустимость идентификатора категории.
 */
export function isCommissionQuestionCategory(value: string): value is CommissionQuestionCategoryId {
  return CATEGORY_IDS.has(value as CommissionQuestionCategoryId);
}

/**
 * Нормализует список уровней должностей.
 */
export function normalizeCommissionPositionLevels(values: ReadonlyArray<string>): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => POSITION_LEVEL_VALUES.has(value)))];
}

/**
 * Нормализует список специальностей.
 */
export function normalizeCommissionSpecialties(values: ReadonlyArray<string>): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => SPECIALTY_VALUES.has(value)))];
}
