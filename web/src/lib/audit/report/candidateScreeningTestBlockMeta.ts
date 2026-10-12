import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import type { AuditInternalKey } from "@/lib/audit/auditTypes";
import { hasSectarianismAnswers } from "@/lib/audit/odReserveSectarianism";
import type { AuditTestBlockSpec } from "@/lib/audit/report/auditTestBlockMeta";
import { BATTERY_PROF_SB_STEP_MARKER } from "@/lib/audit/batteryStepMarkers";

const EMPTY_INTERNAL_KEYS: ReadonlyArray<AuditInternalKey> = [];

/** Базовые блоки скрининга без теста на сектантство. */
const CANDIDATE_SCREENING_CORE_TEST_BLOCK_SPECS: ReadonlyArray<AuditTestBlockSpec> = [
  {
    blockIndex: 0,
    title: "Анкета ПРОФ СБ",
    methodology:
      "Расширенная анкета кандидата (step-4): личные данные, образование, опыт, спецопыт",
    stepIndexes: [BATTERY_PROF_SB_STEP_MARKER],
    internalKeys: EMPTY_INTERNAL_KEYS,
  },
  {
    blockIndex: 1,
    title: "Культурно-свободный тест на интеллект (CFIT)",
    methodology:
      "CFIT, 8 субтестов (92 задания); IQ по таблице «общая сумма» 21–88 (взрослые 18+)",
    stepIndexes: [10, 11, 12, 13, 14, 15, 16, 17],
    internalKeys: [
      "cfit_subtest_1",
      "cfit_subtest_2",
      "cfit_subtest_3",
      "cfit_subtest_4",
      "cfit_subtest_5",
      "cfit_subtest_6",
      "cfit_subtest_7",
      "cfit_subtest_8",
    ],
  },
  {
    blockIndex: 2,
    title: "Тест-опросник Томаса-Килманна",
    methodology: "Поведение в конфликтной ситуации (30 пар А/Б)",
    stepIndexes: [20],
    internalKeys: ["thomas_kilmann_conflict"],
  },
  {
    blockIndex: 3,
    title: "Мотивация и стимулирование персонала",
    methodology: "Анкета типа трудовой мотивации (Герчиков, 16 пунктов + паспорт)",
    stepIndexes: [21],
    internalKeys: ["gerchikov_motivation_full"],
  },
  {
    blockIndex: 4,
    title: "Диагностика психического «выгорания»",
    methodology: "Рукавишников (72 утверждения, ПИ / ЛО / ПМ / ИПВ / ИЗР)",
    stepIndexes: [19],
    internalKeys: ["maslach_burnout"],
  },
];

/** Блок теста на сектантство — в отчёт только при наличии ответов. */
export const CANDIDATE_SCREENING_SECTARIANISM_TEST_BLOCK_SPEC: AuditTestBlockSpec = {
  blockIndex: 5,
  title: "Тест на выявление сектантства",
  methodology: "Опросник из 38 вопросов с вариантами ответа",
  stepIndexes: [26],
  internalKeys: ["sectarianism_screening"],
};

/**
 * Полный фиксированный порядок блоков (включая сектантство) — для сигнатур профиля.
 */
export const CANDIDATE_SCREENING_TEST_BLOCK_SPECS: ReadonlyArray<AuditTestBlockSpec> = [
  ...CANDIDATE_SCREENING_CORE_TEST_BLOCK_SPECS,
  CANDIDATE_SCREENING_SECTARIANISM_TEST_BLOCK_SPEC,
];

/**
 * Блоки отчёта скрининга: сектантство только если есть ответы.
 */
export function getCandidateScreeningTestBlockSpecs(
  answers?: AuditAnswersMap
): ReadonlyArray<AuditTestBlockSpec> {
  if (hasSectarianismAnswers(answers)) {
    return CANDIDATE_SCREENING_TEST_BLOCK_SPECS;
  }
  return CANDIDATE_SCREENING_CORE_TEST_BLOCK_SPECS;
}
