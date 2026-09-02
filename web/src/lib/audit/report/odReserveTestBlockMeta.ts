import type { AuditTestBlockSpec } from "@/lib/audit/report/auditTestBlockMeta";
import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { hasSectarianismAnswers } from "@/lib/audit/odReserveSectarianism";

/**
 * Фиксированный порядок блоков отчёта для батареи ОД / руководителей / кадрового резерва.
 * Порядок прохождения тестов может отличаться; в PDF и HTML отчёте — всегда этот.
 */
export const OD_RESERVE_TEST_BLOCK_SPECS: ReadonlyArray<AuditTestBlockSpec> = [
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
    title: "Способность к общению",
    methodology:
      "Выявление коммуникативных и организаторских склонностей (40 вопросов, да/нет)",
    stepIndexes: [23],
    internalKeys: ["kos_communicative_organizational"],
  },
  {
    blockIndex: 3,
    title: "Тест-опросник Томаса-Килманна",
    methodology: "Поведение в конфликтной ситуации (30 пар А/Б)",
    stepIndexes: [20],
    internalKeys: ["thomas_kilmann_conflict"],
  },
  {
    blockIndex: 4,
    title: "Мотивация и стимулирование персонала",
    methodology: "Анкета типа трудовой мотивации (Герчиков, 16 пунктов + паспорт)",
    stepIndexes: [21],
    internalKeys: ["gerchikov_motivation_full"],
  },
  {
    blockIndex: 5,
    title: "Диагностика психического «выгорания»",
    methodology: "Рукавишников (72 утверждения, ПИ / ЛО / ПМ / ИПВ / ИЗР)",
    stepIndexes: [19],
    internalKeys: ["maslach_burnout"],
  },
  {
    blockIndex: 6,
    title: "Ориентационный стиль профессионально-деятельностного общения",
    methodology: "Rowe — стили делового общения (40 пар)",
    stepIndexes: [1],
    internalKeys: ["rowe_decision_styles"],
  },
  {
    blockIndex: 7,
    title: "Целеустремлённость",
    methodology: "Краткая шкала целеполагания (10 MCQ)",
    stepIndexes: [2],
    internalKeys: ["goal_pursuit_short"],
  },
  {
    blockIndex: 8,
    title: "Готовность к риску",
    methodology: "Schubert — шкала риска (25 пунктов, Likert-5)",
    stepIndexes: [5],
    internalKeys: ["schubert_risk_full"],
  },
  {
    blockIndex: 9,
    title: "Оценка типа стрессоустойчивости",
    methodology: "Тип А / тип Б (20 пунктов, Да / Нет / Не знаю)",
    stepIndexes: [6],
    internalKeys: ["type_a_jenkins_short"],
  },
  {
    blockIndex: 10,
    title: "Самооценка психологической адаптивности",
    methodology: "Психологическая гибкость (группы А и Б, 15 Да/Нет)",
    stepIndexes: [7],
    internalKeys: ["strelyau_temperament_short"],
  },
  {
    blockIndex: 11,
    title: "Локус контроля Дж. Роттер",
    methodology: "Шкалы экстернальности и интернальности (29 пар)",
    stepIndexes: [8],
    internalKeys: ["rotter_locus"],
  },
  {
    blockIndex: 12,
    title: "Тест на выгорание (Маслач)",
    methodology: "Опросник MBI, 22 утверждения (EE / DP / PA)",
    stepIndexes: [25],
    internalKeys: ["maslach_mbi_short"],
  },
];

/** Блок теста на сектантство — только для новых прохождений ОД / кадрового резерва. */
export const OD_RESERVE_SECTARIANISM_TEST_BLOCK_SPEC: AuditTestBlockSpec = {
  blockIndex: 13,
  title: "Тест на выявление сектантства",
  methodology: "Опросник из 38 вопросов с вариантами ответа (ключ — отдельная задача)",
  stepIndexes: [26],
  internalKeys: ["sectarianism_screening"],
};

/**
 * Возвращает блоки отчёта ОД: 12 методик или 13, если пройден тест на сектантство.
 */
export function getOdReserveTestBlockSpecs(
  answers?: AuditAnswersMap
): ReadonlyArray<AuditTestBlockSpec> {
  if (hasSectarianismAnswers(answers)) {
    return [...OD_RESERVE_TEST_BLOCK_SPECS, OD_RESERVE_SECTARIANISM_TEST_BLOCK_SPEC];
  }
  return OD_RESERVE_TEST_BLOCK_SPECS;
}
