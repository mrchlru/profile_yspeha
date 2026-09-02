import { AUDIT_STEP_26_QUESTION_COUNT } from "@/lib/audit/questions/step26Sectarianism";
import { computeSectarianismEvaluation } from "@/lib/audit/report/computeSectarianismScores";
import { SECTARIANISM_CLEAR_CONCLUSION, SECTARIANISM_DETECTION_THRESHOLD_PERCENT } from "@/lib/audit/report/keys/sectarianismScoringKey";
import {
  getStepAnsweredCount,
  type AuditAnswersMap,
} from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import {
  getAuditTestBlockSpecsForProfile,
  type AuditReportProfile,
} from "@/lib/audit/report/auditReportProfile";
import { getOdReserveTestBlockSpecs } from "@/lib/audit/report/odReserveTestBlockMeta";
import {
  buildInterpretationLayout,
  splitInterpretationAtConclusion,
  splitIntoParagraphs,
} from "@/lib/audit/report/auditInterpretationLayout";
import type { AuditReportTestBlock } from "@/lib/audit/report/auditReportTypes";
import type { Step4Data } from "@/lib/step4/step4Types";
import { buildStep4AiSummary, buildStep4ReportSections } from "@/lib/step4/step4Labels";
import { buildEducationLearningConclusionText } from "@/lib/step4/computeEducationLearningConclusion";
import {
  computeEruditionScores,
  eruditionInterpretation,
  computeGerchikovProfile,
  computeGoalPursuitScores,
  computeKeirseyScores,
  keirseyDominantPoleLabel,
  keirseyInterpretation,
  computeKosScores,
  goalPursuitInterpretation,
  computePaperworkScores,
  computePochebutScores,
  computeRotterScores,
  rotterInterpretation,
  computeRoweStyleScores,
  computeSchubertScores,
  computeSnyderScores,
  computeStrelyauScores,
  strelyauInterpretation,
  schubertInterpretation,
  snyderInterpretation,
  computeThomasKilmannScores,
  thomasKilmannInterpretation,
  computeToleranceScores,
  toleranceFactorBandLabel,
  toleranceInterpretation,
  computeTypeAScores,
  typeAInterpretation,
  gerchikovInterpretation,
  gerchikovTypeLabel,
  keirseyTemperamentLabel,
  keirseyTypeLabel,
  kosInterpretation,
  kosLevelLabel,
  pochebutInterpretation,
  pochebutLevelLabel,
  roweDominantInterpretation,
  roweDominantStyleLabel,
  thomasKilmannStyleLabel,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import {
  cfitInterpretation,
  computeCfitTotals,
  formatCfitIqReportLine,
} from "@/lib/audit/report/computeCfitTotals";
import { CFIT_ITEM_COUNT_TOTAL } from "@/lib/audit/report/keys/auditScoringKeys";
import {
  burnoutInterpretation,
  computeBurnoutScores,
} from "@/lib/audit/report/computeMbiStep19";
import { computeMaslachMbiFromAuditStep } from "@/lib/audit/report/computeMaslachMbiFromAuditStep";
import type { GerchikovMotivationType } from "@/lib/audit/report/keys/auditScoringKeys";
import { ROWE_STYLE_LABELS, SCHUBERT_SCALE_MAX, SCHUBERT_SCALE_MIN } from "@/lib/audit/report/keys/auditScoringKeys";
import {
  GOAL_PURSUIT_INTERPRETATION_BANDS,
  PAPERWORK_BALANCED,
  SHUBERT_INTERPRETATION_BANDS,
  SNYDER_INTERPRETATION_BANDS,
} from "@/lib/audit/report/keys/auditScoringKeys";

/**
 * Собирает блоки отчёта: результаты по методике + текст интерпретации для PDF.
 */
export function buildAuditTestBlocks(
  answers: AuditAnswersMap,
  profile: AuditReportProfile = "full_state_audit",
  step4Data?: Step4Data
): ReadonlyArray<AuditReportTestBlock> {
  const specs =
    profile === "od_reserve"
      ? getOdReserveTestBlockSpecs(answers)
      : getAuditTestBlockSpecsForProfile(profile);
  return specs.map((spec) => {
    if (
      (profile === "tu_management_chef" || profile === "candidate_screening") &&
      spec.blockIndex === 0
    ) {
      const block = interpretProfSbStep4(step4Data);
      return {
        blockIndex: spec.blockIndex,
        title: spec.title,
        methodology: spec.methodology,
        stepIndexes: spec.stepIndexes,
        internalKeys: spec.internalKeys,
        results: block.results,
        aboutParagraphs: block.aboutParagraphs,
        conclusionParagraphs: block.conclusionParagraphs,
        interpretation: block.interpretation,
        schubertScale: block.schubertScale,
      };
    }
    const block = interpretBlock(spec.internalKeys, spec.stepIndexes, answers);
    return {
      blockIndex: spec.blockIndex,
      title: spec.title,
      methodology: spec.methodology,
      stepIndexes: spec.stepIndexes,
      internalKeys: spec.internalKeys,
      results: block.results,
      aboutParagraphs: block.aboutParagraphs,
      conclusionParagraphs: block.conclusionParagraphs,
      interpretation: block.interpretation,
      schubertScale: block.schubertScale,
    };
  });
}

type InterpretBlockResult = {
  results: string[];
  aboutParagraphs: ReadonlyArray<string>;
  conclusionParagraphs: ReadonlyArray<string>;
  interpretation: string;
  schubertScale?: AuditReportTestBlock["schubertScale"];
};

function _bandsAboutText(
  bands: ReadonlyArray<{ label: string; description: string }>
): string[] {
  return bands.map((band) => `${band.label}: ${band.description}`);
}

/** Секции «О методике» и «Заключение» из готовых абзацев. */
function _layoutBlock(
  officialTitle: string,
  methodAbout: ReadonlyArray<string>,
  conclusionParts: ReadonlyArray<string>
): Pick<InterpretBlockResult, "aboutParagraphs" | "conclusionParagraphs" | "interpretation"> {
  return buildInterpretationLayout(officialTitle, methodAbout, conclusionParts);
}

/** Разбивает полный текст интерпретации по маркеру «Заключение:». */
function _layoutFromFullText(
  officialTitle: string,
  methodAbout: ReadonlyArray<string>,
  fullText: string
): Pick<InterpretBlockResult, "aboutParagraphs" | "conclusionParagraphs" | "interpretation"> {
  const { aboutText, conclusionText } = splitInterpretationAtConclusion(fullText);
  const aboutExtras = [...methodAbout, ...splitIntoParagraphs(aboutText)];
  const conclusion =
    conclusionText !== null ? splitIntoParagraphs(conclusionText) : [];
  return buildInterpretationLayout(officialTitle, aboutExtras, conclusion);
}

function interpretProfSbStep4(step4Data: Step4Data | undefined): InterpretBlockResult {
  if (step4Data === undefined) {
    return interpretGenericStep({}, 0, 0, "Анкета ПРОФ СБ", [
      "Анкета не заполнена или не передана на сервер.",
    ]);
  }
  const sections = buildStep4ReportSections(step4Data);
  const results: string[] = [];
  for (const section of sections) {
    for (const row of section.rows) {
      results.push(`${row.key}: ${row.value}`);
    }
    if (section.groups) {
      for (const group of section.groups) {
        for (const row of group.rows) {
          results.push(`${group.heading} — ${row.key}: ${row.value}`);
        }
      }
    }
  }
  const educationConclusion = buildEducationLearningConclusionText(step4Data);
  return {
    results,
    aboutParagraphs: [
      "Анкета профессиональной самооценки и биографических данных (тот же блок, что в скрининге, step-4).",
    ],
    conclusionParagraphs:
      educationConclusion.trim().length > 0 ? [educationConclusion] : [],
    interpretation: buildStep4AiSummary(step4Data),
  };
}

function interpretBlock(
  internalKeys: ReadonlyArray<string>,
  stepIndexes: ReadonlyArray<number>,
  answers: AuditAnswersMap
): InterpretBlockResult {
  const key = internalKeys[0];
  switch (key) {
    case "rowe_decision_styles":
      return interpretRowe(answers);
    case "goal_pursuit_short":
      return interpretGoal(answers);
    case "paperwork_style_short":
      return interpretPaperwork(answers);
    case "snyder_self_monitoring":
      return interpretSnyder(answers);
    case "schubert_risk_full":
      return interpretSchubert(answers);
    case "type_a_jenkins_short":
      return interpretTypeA(answers);
    case "strelyau_temperament_short":
      return interpretStrelyau(answers);
    case "rotter_locus":
      return interpretRotter(answers);
    case "tolerance_likert7_33":
      return interpretTolerance(answers);
    case "cfit_subtest_1":
      return interpretCfit(answers);
    case "keirsey_temperament":
      return interpretKeirsey(answers);
    case "maslach_burnout":
      return interpretMbi(answers);
    case "thomas_kilmann_conflict":
      return interpretThomasKilmann(answers);
    case "gerchikov_motivation_full":
      return interpretGerchikov(answers);
    case "pochebut_loyalty":
      return interpretPochebut(answers);
    case "kos_communicative_organizational":
      return interpretKos(answers);
    case "general_erudition_pool":
      return interpretErudition(answers);
    case "maslach_mbi_short":
      return interpretMaslachMbi(answers, stepIndexes[0] ?? 25);
    case "sectarianism_screening":
      return interpretSectarianismScreening(answers, stepIndexes[0] ?? 26);
    default:
      return interpretGenericStep(answers, stepIndexes[0] ?? 1, 0, "Методика", [
        "Данные собраны; ключ в материалах заказчика не сопоставлен с этим шагом.",
      ]);
  }
}

function interpretRowe(answers: AuditAnswersMap): InterpretBlockResult {
  const rowe = computeRoweStyleScores(answers[1]);
  const results = [
    `Закрыто пар: ${String(rowe.pairsAnswered)} из ${String(rowe.pairsTotal)}`,
    `Стиль 1 (${ROWE_STYLE_LABELS[1]}): ${String(rowe.styleCounts[1])} баллов (макс. 20)`,
    `Стиль 2 (${ROWE_STYLE_LABELS[2]}): ${String(rowe.styleCounts[2])} баллов (макс. 20)`,
    `Стиль 3 (${ROWE_STYLE_LABELS[3]}): ${String(rowe.styleCounts[3])} баллов (макс. 20)`,
    `Стиль 4 (${ROWE_STYLE_LABELS[4]}): ${String(rowe.styleCounts[4])} баллов (макс. 20)`,
  ];
  const methodAbout = [
    "Методика выявляет предпочитаемые стили управленческих решений по четырём шкалам.",
    "Каждый положительный ответ в парном выборе даёт 1 балл; максимум по стилю — 20.",
    ...([1, 2, 3, 4] as const).map((id) => `Стиль ${String(id)} — ${ROWE_STYLE_LABELS[id]}.`),
  ];
  if (rowe.dominantStyles.length === 0) {
    return {
      results,
      ..._layoutBlock("Тест 1. Стили управленческих решений (Роу).", methodAbout, [
        "Недостаточно пар для профиля стилей.",
      ]),
    };
  }
  const dominantLine =
    rowe.dominantStyles.length === 1
      ? roweDominantStyleLabel(rowe.dominantStyles[0]!)
      : rowe.dominantStyles.map((s) => roweDominantStyleLabel(s)).join("; ");
  return {
    results: [...results, `Предпочтительный стиль: ${dominantLine}`],
    ..._layoutBlock("Тест 1. Стили управленческих решений (Роу).", methodAbout, [
      roweDominantInterpretation(rowe.dominantStyles),
    ]),
  };
}

function interpretGoal(answers: AuditAnswersMap): InterpretBlockResult {
  const g = computeGoalPursuitScores(answers[2]);
  const results = [
    `Ответов: ${String(g.answered)} из 10`,
    g.sum !== null ? `Сумма: ${String(g.sum)} из 30` : "Сумма: —",
    g.bandLabel !== null ? `Диапазон: ${g.bandLabel}` : "Диапазон: —",
  ];
  return {
    results,
    ..._layoutBlock(
      "Тест 2. Оценка целеустремлённости.",
      [
        "10 утверждений, каждое оценивается от 1 до 3 баллов (максимум 30).",
        ..._bandsAboutText(GOAL_PURSUIT_INTERPRETATION_BANDS),
      ],
      [goalPursuitInterpretation(g)]
    ),
  };
}

function interpretPaperwork(answers: AuditAnswersMap): InterpretBlockResult {
  const p = computePaperworkScores(answers[3]);
  const results = [
    `Ответов: ${String(p.answered)} из 12`,
    `Группа 1: ${String(p.groupScores[1])} баллов (макс. 9)`,
    `Группа 2: ${String(p.groupScores[2])} баллов (макс. 9)`,
    `Группа 3: ${String(p.groupScores[3])} баллов (макс. 9)`,
    `Группа 4: ${String(p.groupScores[4])} баллов (макс. 9)`,
  ];
  if (p.profiles.length > 0) {
    results.push(`Профили: ${p.profiles.join("; ")}`);
  }
  return {
    results,
    ..._layoutBlock(
      "Тест 3. Стиль работы с документами.",
      [PAPERWORK_BALANCED, "Четыре группы утверждений описывают разные стили документооборота."],
      p.interpretationParts.length > 0
        ? p.interpretationParts
        : ["Недостаточно данных для интерпретации (нужны ответы на все 12 утверждений)."]
    ),
  };
}

function interpretSnyder(answers: AuditAnswersMap): InterpretBlockResult {
  const s = computeSnyderScores(answers[4]);
  const results = [
    `Ответов: ${String(s.answered)} из 25`,
    s.score !== null ? `Совпадений с ключом: ${String(s.score)} из 25` : "Совпадений: —",
    s.bandLabel !== null ? `Диапазон: ${s.bandLabel}` : "Диапазон: —",
  ];
  return {
    results,
    ..._layoutBlock(
      "Тест 4. ОСКСВО (самоуправление в общении, М. Snyder).",
      [
        "Опросник самонаблюдения в общении; интерпретация по числу совпадений с ключом.",
        ..._bandsAboutText(SNYDER_INTERPRETATION_BANDS),
      ],
      [snyderInterpretation(s)]
    ),
  };
}

function interpretSchubert(answers: AuditAnswersMap): InterpretBlockResult {
  const s = computeSchubertScores(answers[5]);
  const results = [
    `Ответов: ${String(s.answered)} из 25`,
    s.sum !== null ? `Сумма: ${String(s.sum)} (-50...+50)` : "Сумма: -",
  ];
  if (s.bandLabel !== null) {
    results.push(`Диапазон: ${s.bandLabel}`);
  }
  return {
    results,
    schubertScale:
      s.sum !== null
        ? { sum: s.sum, min: SCHUBERT_SCALE_MIN, max: SCHUBERT_SCALE_MAX }
        : undefined,
    ..._layoutBlock(
      "Тест 5. Готовность к риску (Шуберт).",
      [
        "Сумма ответов по шкале от -50 до +50 отражает готовность к рискованным решениям.",
        ..._bandsAboutText(SHUBERT_INTERPRETATION_BANDS),
      ],
      [schubertInterpretation(s)]
    ),
  };
}

function interpretTypeA(answers: AuditAnswersMap): InterpretBlockResult {
  const t = computeTypeAScores(answers[6]);
  const results = [
    `Ответов: ${String(t.answered)} из 20`,
    t.sum !== null ? `Сумма: ${String(t.sum)} (0…40)` : "Сумма: —",
  ];
  if (t.bandLabel !== null) {
    results.push(`Диапазон: ${t.bandLabel}`);
  }
  if (t.profile !== null) {
    const profileLabel =
      t.profile === "type_b"
        ? "тип Б"
        : t.profile === "type_b_tendency"
          ? "склонность к типу Б"
          : t.profile === "type_a_tendency"
            ? "склонность к типу А"
            : "тип А";
    results.push(`Профиль: ${profileLabel}`);
  }
  return {
    results,
    ..._layoutFromFullText(
      "Тест 6. Оценка типа стрессоустойчивости.",
      [],
      typeAInterpretation(t)
    ),
  };
}

function interpretStrelyau(answers: AuditAnswersMap): InterpretBlockResult {
  const s = computeStrelyauScores(answers[7]);
  const results = [
    `Ответов: ${String(s.answered)} из 15`,
    `Группа А (гибкость): «Да» - ${String(s.groupAYes)} из 10`,
    `Группа Б (инертность): «Да» - ${String(s.groupBYes)} из 5`,
    s.diff !== null ? `Показатель гибкости (А - Б): ${String(s.diff)}` : "Показатель: -",
  ];
  if (s.bandLabel !== null) {
    results.push(`Уровень: ${s.bandLabel}`);
  }
  return {
    results,
    ..._layoutFromFullText(
      "Тест 7. Самооценка психологической адаптивности.",
      [],
      strelyauInterpretation(s)
    ),
  };
}

function interpretRotter(answers: AuditAnswersMap): InterpretBlockResult {
  const r = computeRotterScores(answers[8]);
  const results = [
    `Ключевых пар: ${String(r.answered)} из 23 (фоновые 1, 8, 14, 19, 24, 27 не учитываются)`,
    r.external !== null ? `Экстернальность: ${String(r.external)} из 23` : "Экстернальность: -",
    r.internal !== null ? `Интернальность: ${String(r.internal)} из 23` : "Интернальность: -",
  ];
  if (r.orientation === "external") {
    results.push("Преобладает: экстернальность");
  } else if (r.orientation === "internal") {
    results.push("Преобладает: интернальность");
  } else if (r.orientation === "balanced") {
    results.push("Преобладает: шкалы равны");
  }
  return {
    results,
    ..._layoutFromFullText(
      "Тест 8. Локус контроля (Дж. Роттер).",
      [],
      rotterInterpretation(r)
    ),
  };
}

function interpretTolerance(answers: AuditAnswersMap): InterpretBlockResult {
  const t = computeToleranceScores(answers[9]);
  const results = [
    `Ответов: ${String(t.answered)} из 33`,
    t.tn !== null
      ? `ТН (толерантность): ${String(t.tn)} (${toleranceFactorBandLabel("tn", t.tn)})`
      : "ТН: -",
    t.itn1 !== null
      ? `ИТН-1 (интолерантность): ${String(t.itn1)} (${toleranceFactorBandLabel("itn1", t.itn1)})`
      : "ИТН-1: -",
    t.mitn !== null
      ? `МИТН (межличностная): ${String(t.mitn)} (${toleranceFactorBandLabel("mitn", t.mitn)})`
      : "МИТН: -",
  ];
  return {
    results,
    ..._layoutFromFullText(
      "Тест 9. Опросник толерантности-интолерантности к неопределённости (Т.В. Корнилова).",
      [],
      toleranceInterpretation(t)
    ),
  };
}

function interpretCfit(answers: AuditAnswersMap): InterpretBlockResult {
  const cfit = computeCfitTotals(answers);
  const results = [
    `Ответов: ${String(cfit.answeredTotal)} из ${String(CFIT_ITEM_COUNT_TOTAL)}`,
    `Часть I (субтесты 1-4): ${String(cfit.part1Correct)}/${String(cfit.part1Scorable)} верных`,
    `Часть II (субтесты 1-4): ${String(cfit.part2Correct)}/${String(cfit.part2Scorable)} верных`,
    `Общий сырой балл: ${String(cfit.correctTotal)} из ${String(CFIT_ITEM_COUNT_TOTAL)}`,
    formatCfitIqReportLine(cfit),
    ...cfit.byStep.map(
      (s) =>
        `Часть ${String(s.part)}, субтест ${String(s.subtest)}: ${String(s.correct)}/${String(s.scorable)} верных`
    ),
  ];
  return {
    results,
    ..._layoutFromFullText(
      "Тест 10. Культурно-свободный тест на интеллект (CFIT).",
      [],
      cfitInterpretation(cfit)
    ),
  };
}

function interpretKeirsey(answers: AuditAnswersMap): InterpretBlockResult {
  const k = computeKeirseyScores(answers[18]);
  const eiLetter = k.e > k.i ? "E" : "I";
  const snLetter = k.s > k.n ? "S" : "N";
  const tfLetter = k.t > k.f ? "T" : "F";
  const jpLetter = k.j > k.p ? "J" : "P";
  const results = [
    `Ответов: ${String(k.pairsAnswered)} из ${String(k.pairsTotal)}`,
    `E/I: ${String(k.e)}/${String(k.i)} - ${keirseyDominantPoleLabel(eiLetter)}`,
    `S/N: ${String(k.s)}/${String(k.n)} - ${keirseyDominantPoleLabel(snLetter)}`,
    `T/F: ${String(k.t)}/${String(k.f)} - ${keirseyDominantPoleLabel(tfLetter)}`,
    `J/P: ${String(k.j)}/${String(k.p)} - ${keirseyDominantPoleLabel(jpLetter)}`,
  ];
  if (k.typeCode !== null) {
    results.push(`Тип: ${keirseyTypeLabel(k.typeCode)}`);
  }
  if (k.temperament !== null) {
    results.push(`Темперамент: ${keirseyTemperamentLabel(k.temperament)}`);
  }
  if (k.brightnessSum !== null) {
    results.push(
      `Яркость Σ(b): ${String(k.brightnessSum)} (${
        k.brightnessLevel === "bright" ? "яркий тип" : "неяркий тип"
      })`
    );
  }
  return {
    results,
    ..._layoutFromFullText("Тест 11. Методика Д. Кейрси.", [], keirseyInterpretation(k)),
  };
}

function interpretMbi(answers: AuditAnswersMap): InterpretBlockResult {
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const b = computeBurnoutScores(burnoutStep ? answers[burnoutStep.stepIndex] : undefined);
  const results = [
    `Ответов: ${String(b.answeredCount)} из ${String(b.totalItems)}`,
    b.pi !== null ? `ПИ (истощение): ${String(b.pi)}` : "ПИ: не определён",
    b.lo !== null ? `ЛО (отдаление): ${String(b.lo)}` : "ЛО: не определён",
    b.pm !== null ? `ПМ (мотивация): ${String(b.pm)}` : "ПМ: не определён",
    b.ipv !== null ? `ИПВ (индекс): ${String(b.ipv)}` : "ИПВ: не определён",
    b.workerLoad !== null ? `ИЗР (индекс загрузки): ${String(b.workerLoad)}` : "ИЗР: не определён",
  ];
  return {
    results,
    ..._layoutFromFullText(
      "Тест 12. Диагностика психического «выгорания» (А. Рукавишников).",
      [],
      burnoutInterpretation(b)
    ),
  };
}

function interpretThomasKilmann(answers: AuditAnswersMap): InterpretBlockResult {
  const tk = computeThomasKilmannScores(answers[20]);
  const results = [
    `Ответов: ${String(tk.answered)} из ${String(tk.totalPairs)}`,
    `Соперничество: ${String(tk.counts.competing)}`,
    `Сотрудничество: ${String(tk.counts.collaborating)}`,
    `Компромисс: ${String(tk.counts.compromising)}`,
    `Избегание: ${String(tk.counts.avoiding)}`,
    `Приспособление: ${String(tk.counts.accommodating)}`,
    tk.dominant !== null
      ? `Ведущий стиль: ${thomasKilmannStyleLabel(tk.dominant)}`
      : "Ведущий стиль: не определён",
    tk.formulaA !== null && tk.formulaB !== null
      ? `Формула исхода: А = ${String(tk.formulaA)}, Б = ${String(tk.formulaB)}`
      : "Формула исхода: не определена",
  ];
  return {
    results,
    ..._layoutFromFullText(
      "Тест 13. Тест-опросник Томаса-Килманна на поведение в конфликтной ситуации.",
      [],
      thomasKilmannInterpretation(tk)
    ),
  };
}

function interpretGerchikov(answers: AuditAnswersMap): InterpretBlockResult {
  const g = computeGerchikovProfile(answers[21]);
  const types: GerchikovMotivationType[] = ["ST", "IN", "PR", "PA", "HO"];
  const results = [
    `Проскорено ответов (кодов): ${String(g.answerSlots)}`,
    ...types.map((type) => {
      const index =
        g.indices[type] !== undefined ? g.indices[type]!.toFixed(3) : "-";
      const rank = g.ranks[type] !== undefined ? String(g.ranks[type]) : "-";
      return `${gerchikovTypeLabel(type)}: ${String(g.counts[type])}, индекс ${index}, ранг ${rank}`;
    }),
  ];
  return {
    results,
    ..._layoutFromFullText(
      "Тест 14. Тест-опросник: Мотивация и стимулирование персонала. Анкета для определения типа трудовой мотивации работника.",
      [],
      gerchikovInterpretation(g)
    ),
  };
}

function interpretPochebut(answers: AuditAnswersMap): InterpretBlockResult {
  const p = computePochebutScores(answers[22]);
  return {
    results: [
      `Оценено ключевых суждений: ${String(p.answered)} из 18`,
      p.sum !== null ? `Сумма баллов: ${String(p.sum)}` : "Сумма баллов: -",
      `Уровень лояльности: ${pochebutLevelLabel(p.level)}`,
    ],
    ..._layoutFromFullText("", [], pochebutInterpretation(p)),
  };
}

function interpretKos(answers: AuditAnswersMap): InterpretBlockResult {
  const k = computeKosScores(answers[23]);
  return {
    results: [
      `Ответов: ${String(k.answered)} из 40`,
      `Коммуникативные совпадения: ${String(k.commMatches)}/20`,
      `Организаторские совпадения: ${String(k.orgMatches)}/20`,
      k.commK !== null ? `K комм.: ${k.commK.toFixed(2)}, оценка ${String(k.commLevel)} (${kosLevelLabel(k.commLevel)})` : "K комм.: -",
      k.orgK !== null ? `K орг.: ${k.orgK.toFixed(2)}, оценка ${String(k.orgLevel)} (${kosLevelLabel(k.orgLevel)})` : "K орг.: -",
    ],
    ..._layoutFromFullText(
      "Тест 16. Тест по выявлению способности к общению.",
      [],
      kosInterpretation(k)
    ),
  };
}

function interpretErudition(answers: AuditAnswersMap): InterpretBlockResult {
  const e = computeEruditionScores(answers[24]);
  const percentText =
    e.percentCorrect !== null ? `${Math.round(e.percentCorrect * 100)}%` : "-";
  return {
    results: [
      `Ответов: ${String(e.answered)} из ${String(e.total)}`,
      `Верных: ${String(e.correct)} из ${String(e.answered)} (${percentText})`,
      e.scaledScore !== null
        ? `Баллы для оценки: ${String(e.scaledScore)} из ${String(e.total)}${e.isComplete ? "" : " (экстраполяция)"}`
        : "Баллы для оценки: -",
      e.grade !== null ? `Оценка: ${e.grade}` : "Оценка: -",
    ],
    ..._layoutFromFullText("", [], eruditionInterpretation(e)),
  };
}

function interpretMaslachMbi(answers: AuditAnswersMap, stepIndex: number): InterpretBlockResult {
  const { scores, interpretation } = computeMaslachMbiFromAuditStep(answers[stepIndex]);
  const results = [
    `Ответов: ${String(scores.answeredCount)} из ${String(scores.totalItems)}`,
    scores.ee !== null ? `Эмоциональное истощение (EE): ${String(scores.ee)}` : "EE: —",
    scores.dp !== null ? `Деперсонализация (DP): ${String(scores.dp)}` : "DP: —",
    scores.pa !== null ? `Редукция достижений (PA): ${String(scores.pa)}` : "PA: —",
  ];
  if (interpretation !== null) {
    results.push(interpretation.verdictTitle);
  }
  const conclusion =
    interpretation !== null
      ? [interpretation.verdictText, ...interpretation.recommendationLines]
      : ["Недостаточно ответов для интерпретации по шкалам MBI."];
  return {
    results,
    ..._layoutBlock(
      "Тест на выгорание (Маслач, MBI).",
      [
        "22 утверждения; три шкалы: эмоциональное истощение, деперсонализация, редукция профессиональных достижений.",
        "Интерпретация — по порогам адаптации опросника Маслач.",
      ],
      conclusion
    ),
  };
}

function interpretSectarianismScreening(
  answers: AuditAnswersMap,
  stepIndex: number
): InterpretBlockResult {
  const evaluation = computeSectarianismEvaluation(answers[stepIndex]);
  const results = [
    `Ответов: ${String(evaluation.answeredCount)} из ${String(AUDIT_STEP_26_QUESTION_COUNT)}`,
    ...evaluation.resultLines,
  ];
  const aboutParagraphs = [
    "Опросник на выявление склонности к деструктивным группам (38 вопросов).",
    `Порог выявления признаков: ${String(SECTARIANISM_DETECTION_THRESHOLD_PERCENT)}% совпадения с ключом профиля.`,
  ];
  const conclusionParagraphs: string[] = [];
  if (!evaluation.complete) {
    conclusionParagraphs.push(
      "Тест заполнен не полностью; выводы по ключу предварительные или недоступны."
    );
  } else if (evaluation.anyDetected) {
    conclusionParagraphs.push(
      "Выявлены признаки соответствия одному или нескольким профилям деструктивных групп."
    );
    conclusionParagraphs.push(...evaluation.hrCharacteristicParagraphs);
  } else {
    conclusionParagraphs.push(SECTARIANISM_CLEAR_CONCLUSION);
  }
  return {
    results,
    aboutParagraphs,
    conclusionParagraphs,
    interpretation: [...aboutParagraphs, ...conclusionParagraphs].join("\n\n"),
  };
}

function interpretGenericStep(
  answers: AuditAnswersMap,
  stepIndex: number,
  itemCount: number,
  name: string,
  hints: string[]
): InterpretBlockResult {
  const answered = getStepAnsweredCount(answers[stepIndex]);
  const total =
    itemCount > 0
      ? itemCount
      : (AUDIT_STEPS.find((s) => s.stepIndex === stepIndex)?.itemCount ?? "—");
  return {
    results: [`Ответов: ${String(answered)} из ${String(total)}`],
    ..._layoutBlock(name, hints, ["Данные собраны; ключ в материалах заказчика не сопоставлен с этим шагом."]),
  };
}
