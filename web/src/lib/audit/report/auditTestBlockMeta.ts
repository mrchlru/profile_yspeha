import type { AuditInternalKey } from "@/lib/audit/auditTypes";

export type AuditTestBlockSpec = {
  blockIndex: number;
  title: string;
  methodology: string;
  stepIndexes: ReadonlyArray<number>;
  internalKeys: ReadonlyArray<AuditInternalKey>;
};

/** Порядок блоков отчёта: по одной методике (CFIT — один блок из 8 субтестов). */
export const AUDIT_TEST_BLOCK_SPECS: ReadonlyArray<AuditTestBlockSpec> = [
  {
    blockIndex: 1,
    title: "Стили принятия решений",
    methodology: "Rowe — стили делового общения (40 пар)",
    stepIndexes: [1],
    internalKeys: ["rowe_decision_styles"],
  },
  {
    blockIndex: 2,
    title: "Целеустремлённость",
    methodology: "Краткая шкала целеполагания (10 MCQ)",
    stepIndexes: [2],
    internalKeys: ["goal_pursuit_short"],
  },
  {
    blockIndex: 3,
    title: "Стиль работы с документами",
    methodology: "Likert-4, 12 утверждений, 4 профильные группы",
    stepIndexes: [3],
    internalKeys: ["paperwork_style_short"],
  },
  {
    blockIndex: 4,
    title: "Самомониторинг",
    methodology: "Snyder — самониторинг в социальных ситуациях (25 Д/Н)",
    stepIndexes: [4],
    internalKeys: ["snyder_self_monitoring"],
  },
  {
    blockIndex: 5,
    title: "Готовность к риску",
    methodology: "Schubert — шкала риска (25 пунктов, Likert-5)",
    stepIndexes: [5],
    internalKeys: ["schubert_risk_full"],
  },
  {
    blockIndex: 6,
    title: "Оценка типа стрессоустойчивости",
    methodology: "Тест 6 — тип А / тип Б (20 пунктов, Да / Нет / Не знаю)",
    stepIndexes: [6],
    internalKeys: ["type_a_jenkins_short"],
  },
  {
    blockIndex: 7,
    title: "Самооценка психологической адаптивности",
    methodology: "Тест 7 — психологическая гибкость (группы А и Б, 15 Да/Нет)",
    stepIndexes: [7],
    internalKeys: ["strelyau_temperament_short"],
  },
  {
    blockIndex: 8,
    title: "Локус контроля Дж. Роттер",
    methodology: "Тест 8 — шкалы экстернальности и интернальности (29 пар)",
    stepIndexes: [8],
    internalKeys: ["rotter_locus"],
  },
  {
    blockIndex: 9,
    title: "Толерантность-интолерантность к неопределённости",
    methodology: "Тест 9 — опросник Корнилова (33 пункта, шкала 1-7)",
    stepIndexes: [9],
    internalKeys: ["tolerance_likert7_33"],
  },
  {
    blockIndex: 10,
    title: "Культурно-свободный тест на интеллект (CFIT)",
    methodology:
      "Тест 10 — CFIT, 8 субтестов (92 задания); IQ по таблице «общая сумма» 21–88 (взрослые 18+)",
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
    blockIndex: 11,
    title: "Методика Д. Кейрси",
    methodology: "Тест 11 — определение типа темперамента (70 пар, E/I S/N T/F J/P)",
    stepIndexes: [18],
    internalKeys: ["keirsey_temperament"],
  },
  {
    blockIndex: 12,
    title: "Диагностика психического «выгорания»",
    methodology: "Тест 12 — Рукавишников (72 утверждения, ПИ / ЛО / ПМ / ИПВ / ИЗР)",
    stepIndexes: [19],
    internalKeys: ["maslach_burnout"],
  },
  {
    blockIndex: 13,
    title: "Тест-опросник Томаса-Килманна",
    methodology: "Тест 13 — поведение в конфликтной ситуации (30 пар А/Б)",
    stepIndexes: [20],
    internalKeys: ["thomas_kilmann_conflict"],
  },
  {
    blockIndex: 14,
    title: "Мотивация и стимулирование персонала",
    methodology:
      "Тест 14 - анкета типа трудовой мотивации (Герчиков, 16 пунктов + паспорт)",
    stepIndexes: [21],
    internalKeys: ["gerchikov_motivation_full"],
  },
  {
    blockIndex: 15,
    title: "Лояльность сотрудника к организации",
    methodology:
      "Тест 15 - оценка лояльности по методике Л.Г. Почебут и О.Е. Королевой (36 суждений, шкала 1-11)",
    stepIndexes: [22],
    internalKeys: ["pochebut_loyalty"],
  },
  {
    blockIndex: 16,
    title: "Способность к общению",
    methodology: "Тест 16 - выявление коммуникативных и организаторских склонностей (40 вопросов, да/нет)",
    stepIndexes: [23],
    internalKeys: ["kos_communicative_organizational"],
  },
  {
    blockIndex: 17,
    title: "Общие вопросы на эрудицию",
    methodology: "Тест 17 - общие вопросы на эрудицию (55 вопросов, выбор одного ответа)",
    stepIndexes: [24],
    internalKeys: ["general_erudition_pool"],
  },
];
