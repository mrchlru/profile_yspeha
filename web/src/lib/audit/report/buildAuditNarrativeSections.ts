import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { buildSectarianismHrNarrativeParagraphs, computeSectarianismEvaluation } from "@/lib/audit/report/computeSectarianismScores";
import {
  NARRATIVE_BURNOUT_INTRO,
  NARRATIVE_BURNOUT_IPV_DESCRIPTION,
  NARRATIVE_BURNOUT_IPV_TERM,
  NARRATIVE_BURNOUT_WORKER_LOAD_DESCRIPTION,
  NARRATIVE_BURNOUT_WORKER_LOAD_TERM,
  NARRATIVE_BURNOUT_NORM_HEADERS,
  NARRATIVE_BURNOUT_NORM_TABLES,
  NARRATIVE_BURNOUT_PI_DESCRIPTION,
  NARRATIVE_BURNOUT_PI_TERM,
  NARRATIVE_BURNOUT_PM_DESCRIPTION,
  NARRATIVE_BURNOUT_PM_TERM,
  NARRATIVE_BURNOUT_RESULTS_HEADING,
  NARRATIVE_CONFLICT_INTRO,
  NARRATIVE_GOAL_INTRO,
  NARRATIVE_INTELLIGENCE_INTRO,
  NARRATIVE_KOS_COMM_TABLE_ROWS,
  NARRATIVE_KOS_INTRO,
  NARRATIVE_KOS_ORG_TABLE_ROWS,
  NARRATIVE_KOS_RESULTS_HEADING,
  NARRATIVE_LOCUS_INTRO,
  NARRATIVE_MULTITASK_INTRO,
  NARRATIVE_PAPERWORK_INTRO,
  NARRATIVE_PSYCHOTYPE_DIMENSION_LINES,
  NARRATIVE_PSYCHOTYPE_DISCLAIMER,
  NARRATIVE_PSYCHOTYPE_INTRO_LEAD,
  NARRATIVE_PSYCHOTYPE_INTRO_TAIL,
  NARRATIVE_RISK_INTRO,
  NARRATIVE_ROW_INTRO,
  NARRATIVE_SECTION_TITLES,
  NARRATIVE_STRESS_INTRO,
  KEIRSEY_TYPE_SUBTITLES,
  KEIRSEY_TYPE_TRAITS,
  STRELYAU_NARRATIVE_DESCRIPTIONS,
} from "@/lib/audit/report/auditNarrativeReference";
import { hasSectarianismAnswers } from "@/lib/audit/odReserveSectarianism";
import { buildGerchikovNarrativeParagraphs } from "@/lib/audit/report/buildGerchikovNarrativeParagraphs";
import {
  narrativeBoldTermDefinition,
  narrativeBrandSubheading,
  narrativeHighlight,
  narrativeIndentedLines,
  narrativeInlineResult,
  narrativePlain,
  type AuditReportNarrativeParagraph,
} from "@/lib/audit/report/auditNarrativeParagraph";
import type {
  AuditReportBurnoutNormTable,
  AuditReportKosReferenceTable,
  AuditReportNarrativeSection,
} from "@/lib/audit/report/auditReportTypes";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import {
  buildMaslachManagerBriefContent,
  MASLACH_MANAGER_SECTION_TITLE,
} from "@/lib/burnout/buildMaslachManagerBriefContent";
import { computeMaslachMbiFromAuditStep } from "@/lib/audit/report/computeMaslachMbiFromAuditStep";
import { buildStep4AiSummary } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";
import type { RukavishnikovScaleId } from "@/lib/audit/report/keys/auditScoringKeys";
import { computeCfitTotals } from "@/lib/audit/report/computeCfitTotals";
import {
  computeBurnoutScores,
  burnoutBandLabel,
} from "@/lib/audit/report/computeMbiStep19";
import { isBurnoutPiBandCritical } from "@/lib/burnout/burnoutPiCritical";
import {
  computeGoalPursuitScores,
  computeKeirseyScores,
  computeKosScores,
  computePaperworkScores,
  computeRotterScores,
  computeRoweStyleScores,
  computeSchubertScores,
  computeSnyderScores,
  computeStrelyauScores,
  computeThomasKilmannScores,
  computeTypeAScores,
  thomasKilmannLeadingStyles,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import {
  ROWE_STYLE_INTERPRETATIONS,
  ROWE_STYLE_LABELS,
  THOMAS_KILMANN_CONCLUSION_STYLE_LABELS,
  THOMAS_KILMANN_STYLE_DESCRIPTIONS,
  type RoweStyleId,
} from "@/lib/audit/report/keys/auditScoringKeys";
import { KEIRSEY_TYPE_LABELS, KEIRSEY_TYPE_PORTRAIT_TEXT } from "@/lib/audit/report/keys/auditScoringKeys";

/**
 * Собирает нарративные секции отчёта.
 * Для `od_reserve` — 12–13 методик (сектантство только при наличии ответов).
 */
export function buildAuditNarrativeSections(
  answers: AuditAnswersMap,
  profile: AuditReportProfile = "full_state_audit",
  step4Data?: Step4Data
): ReadonlyArray<AuditReportNarrativeSection> {
  if (profile === "od_reserve") {
    return _buildOdReserveNarrativeSections(answers);
  }
  if (profile === "tu_management_chef") {
    return _buildTuManagementChefNarrativeSections(answers, step4Data);
  }
  if (profile === "candidate_screening") {
    return _buildCandidateScreeningNarrativeSections(answers, step4Data);
  }
  return [
    _buildIntelligenceSection(answers),
    _buildMotivationSection(answers),
    _buildPsychotypeSection(answers),
    _buildConflictSection(answers),
    _buildKosSection(answers),
    _buildBurnoutSection(answers),
    _buildLocusSection(answers),
    _buildStressTypeSection(answers),
    _buildRiskSection(answers),
    _buildMultitaskSection(answers),
    _buildGoalSection(answers),
    _buildCommunicationStyleSection(answers),
    _buildPaperworkSection(answers),
    _buildAdaptabilitySection(answers),
  ];
}

function _section(
  sectionIndex: number,
  title: string,
  paragraphs: ReadonlyArray<AuditReportNarrativeParagraph>,
  extras?: {
    kosTables?: ReadonlyArray<AuditReportKosReferenceTable>;
    burnoutTables?: ReadonlyArray<AuditReportBurnoutNormTable>;
  }
): AuditReportNarrativeSection {
  return {
    sectionIndex,
    title,
    kosTables: extras?.kosTables,
    burnoutTables: extras?.burnoutTables,
    paragraphs: paragraphs.filter((p) => {
      if (p.text !== undefined && p.text.trim().length > 0) {
        return true;
      }
      if (p.highlight !== undefined && p.highlight.trim().length > 0) {
        return true;
      }
      if (p.indentedLines !== undefined && p.indentedLines.length > 0) {
        return true;
      }
      if (p.boldTerm !== undefined && p.boldTerm.trim().length > 0) {
        return true;
      }
      return false;
    }),
  };
}

function _formatKosK(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/** Подпись уровня в строке результатов КОС (как в референсе: «Средний уровень»). */
function _kosResultLevelPhrase(level: number): string {
  switch (level) {
    case 1:
      return "Низкий уровень";
    case 2:
      return "Ниже среднего уровень";
    case 3:
      return "Средний уровень";
    case 4:
      return "Выше среднего уровень";
    case 5:
      return "Высокий уровень";
    default:
      return "Уровень не определён";
  }
}

const KOS_REFERENCE_TABLES: ReadonlyArray<AuditReportKosReferenceTable> = [
  { title: "Коммуникативные способности", rows: NARRATIVE_KOS_COMM_TABLE_ROWS },
  { title: "Организаторские способности", rows: NARRATIVE_KOS_ORG_TABLE_ROWS },
];

const BURNOUT_REFERENCE_TABLES: ReadonlyArray<AuditReportBurnoutNormTable> =
  NARRATIVE_BURNOUT_NORM_TABLES.map((table) => ({
    title: table.title,
    headers: table.headers ?? NARRATIVE_BURNOUT_NORM_HEADERS,
    ranges: table.ranges,
  }));

/** Подпись уровня в строке результатов выгорания (как в референсе: «Среднее значение»). */
function _burnoutResultBandPhrase(scale: RukavishnikovScaleId, score: number): string {
  if (scale === "worker_load") {
    const label = burnoutBandLabel("worker_load", score);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const band = burnoutBandLabel(scale, score);
  if (band.includes("крайне низкий")) {
    return "Крайне низкое значение";
  }
  if (band.includes("низкий")) {
    return "Низкое значение";
  }
  if (band.includes("средний")) {
    return "Среднее значение";
  }
  if (band.includes("крайне высокий")) {
    return "Крайне высокое значение";
  }
  if (band.includes("высокий")) {
    return "Высокое значение";
  }
  return "Значение не определено";
}

function _buildIntelligenceSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const cfit = computeCfitTotals(answers);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_INTELLIGENCE_INTRO)];
  if (cfit.iq !== null) {
    paragraphs.push(
      narrativeInlineResult("В ходе оценки получено значение ", `IQ = ${String(cfit.iq)}`, ".")
    );
  } else {
    paragraphs.push(narrativePlain("В ходе оценки определить значение IQ не удалось (недостаточно данных)."));
  }
  return _section(1, NARRATIVE_SECTION_TITLES.intelligence, paragraphs);
}

function _buildMotivationSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  return _section(
    2,
    NARRATIVE_SECTION_TITLES.motivation,
    buildGerchikovNarrativeParagraphs(answers[21])
  );
}

function _buildPsychotypeSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const k = computeKeirseyScores(answers[18]);
  const paragraphs: AuditReportNarrativeParagraph[] = [
    narrativePlain(NARRATIVE_PSYCHOTYPE_INTRO_LEAD),
    narrativeIndentedLines(NARRATIVE_PSYCHOTYPE_DIMENSION_LINES),
    narrativePlain(NARRATIVE_PSYCHOTYPE_INTRO_TAIL),
  ];
  if (k.typeCode === null || k.pairsAnswered < k.pairsTotal) {
    paragraphs.push(narrativePlain("Тип личности по результатам тестирования определить не удалось."));
    return _section(3, NARRATIVE_SECTION_TITLES.psychotype, paragraphs);
  }
  const subtitle = KEIRSEY_TYPE_SUBTITLES[k.typeCode] ?? KEIRSEY_TYPE_LABELS[k.typeCode] ?? k.typeCode;
  paragraphs.push(
    narrativeHighlight(
      `Тип личности по результатам тестирования — ${k.typeCode}. ${subtitle}`
    )
  );
  const traits = KEIRSEY_TYPE_TRAITS[k.typeCode];
  if (traits !== undefined && traits.length > 0) {
    paragraphs.push(
      narrativeBrandSubheading(
        "Ключевые характеристики выявленного психотипа (могут проявиться в определённых условиях):"
      )
    );
    traits.forEach((trait, index) => {
      paragraphs.push(narrativePlain(`${String(index + 1)}. ${trait}`));
    });
  } else {
    const portrait = KEIRSEY_TYPE_PORTRAIT_TEXT[k.typeCode];
    if (portrait !== undefined) {
      paragraphs.push(narrativePlain(`Ключевые характеристики выявленного психотипа: ${portrait}.`));
    }
  }
  paragraphs.push(narrativePlain(NARRATIVE_PSYCHOTYPE_DISCLAIMER));
  return _section(3, NARRATIVE_SECTION_TITLES.psychotype, paragraphs);
}

function _buildConflictSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const tk = computeThomasKilmannScores(answers[20]);
  const paragraphs: AuditReportNarrativeParagraph[] = [
    narrativePlain(NARRATIVE_CONFLICT_INTRO),
    narrativePlain(`Соперничество: ${THOMAS_KILMANN_STYLE_DESCRIPTIONS.competing}`),
    narrativePlain(`Приспособление: ${THOMAS_KILMANN_STYLE_DESCRIPTIONS.accommodating}`),
    narrativePlain(`Компромисс: ${THOMAS_KILMANN_STYLE_DESCRIPTIONS.compromising}`),
    narrativePlain(`Избегание: ${THOMAS_KILMANN_STYLE_DESCRIPTIONS.avoiding}`),
    narrativePlain(`Сотрудничество: ${THOMAS_KILMANN_STYLE_DESCRIPTIONS.collaborating}`),
  ];
  if (tk.answered >= tk.totalPairs) {
    const leading = thomasKilmannLeadingStyles(tk.counts, 2);
    const resultHighlight =
      leading.length > 0
        ? leading
            .map(
              ({ style, count }) =>
                `${THOMAS_KILMANN_CONCLUSION_STYLE_LABELS[style]} - ${String(count)}`
            )
            .join(", ")
        : "не определён";
    paragraphs.push(
      narrativeInlineResult(
        "Тип поведения в конфликте по результатам тестирования - ",
        resultHighlight,
        "."
      )
    );
  } else {
    paragraphs.push(
      narrativePlain("Тип поведения в конфликте по результатам тестирования определить не удалось.")
    );
  }
  return _section(4, NARRATIVE_SECTION_TITLES.conflict, paragraphs);
}

function _buildKosSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const k = computeKosScores(answers[23]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_KOS_INTRO)];
  paragraphs.push(narrativeBrandSubheading(NARRATIVE_KOS_RESULTS_HEADING));
  if (k.answered < 40 || k.commK === null || k.orgK === null) {
    paragraphs.push(
      narrativePlain("Результаты оценки коммуникативных и организаторских способностей недоступны.")
    );
    return _section(5, NARRATIVE_SECTION_TITLES.kos, paragraphs, {
      kosTables: KOS_REFERENCE_TABLES,
    });
  }
  const commLevel = k.commLevel ?? 0;
  const orgLevel = k.orgLevel ?? 0;
  paragraphs.push(
    narrativeInlineResult(
      "",
      `Коммуникативные умения – ${_formatKosK(k.commK)}`,
      ` — ${_kosResultLevelPhrase(commLevel)} (оценка ${String(commLevel)})`
    )
  );
  paragraphs.push(
    narrativeInlineResult(
      "",
      `Организаторские умения – ${_formatKosK(k.orgK)}`,
      ` — ${_kosResultLevelPhrase(orgLevel)} (оценка ${String(orgLevel)})`
    )
  );
  return _section(5, NARRATIVE_SECTION_TITLES.kos, paragraphs, {
    kosTables: KOS_REFERENCE_TABLES,
  });
}

function _buildBurnoutSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const b = computeBurnoutScores(burnoutStep ? answers[burnoutStep.stepIndex] : undefined);
  const paragraphs: AuditReportNarrativeParagraph[] = [
    narrativePlain(NARRATIVE_BURNOUT_INTRO),
    narrativeBoldTermDefinition(NARRATIVE_BURNOUT_PI_TERM, NARRATIVE_BURNOUT_PI_DESCRIPTION),
    narrativeBoldTermDefinition(NARRATIVE_BURNOUT_PM_TERM, NARRATIVE_BURNOUT_PM_DESCRIPTION),
    narrativeBoldTermDefinition(NARRATIVE_BURNOUT_IPV_TERM, NARRATIVE_BURNOUT_IPV_DESCRIPTION),
    narrativeBoldTermDefinition(
      NARRATIVE_BURNOUT_WORKER_LOAD_TERM,
      NARRATIVE_BURNOUT_WORKER_LOAD_DESCRIPTION
    ),
    narrativeBrandSubheading(NARRATIVE_BURNOUT_RESULTS_HEADING),
  ];
  if (b.pi !== null && b.lo !== null && b.pm !== null) {
    const piCritical = isBurnoutPiBandCritical(b.piBand);
    const workerLoadCritical =
      b.workerLoadBand === "high" || b.workerLoadBand === "extremely_high";
    paragraphs.push(
      narrativeInlineResult(
        "",
        `ПИ – ${String(b.pi)}`,
        ` — ${_burnoutResultBandPhrase("pi", b.pi)}`,
        { highlightDanger: piCritical }
      )
    );
    paragraphs.push(
      narrativeInlineResult(
        "",
        `ЛО – ${String(b.lo)}`,
        ` — ${_burnoutResultBandPhrase("lo", b.lo)}`
      )
    );
    paragraphs.push(
      narrativeInlineResult(
        "",
        `ПМ – ${String(b.pm)}`,
        ` — ${_burnoutResultBandPhrase("pm", b.pm)}`
      )
    );
    if (b.ipv !== null) {
      paragraphs.push(
        narrativeInlineResult(
          "",
          `ИПВ – ${String(b.ipv)}`,
          ` — ${_burnoutResultBandPhrase("ipv", b.ipv)}`
        )
      );
    }
    if (b.workerLoad !== null) {
      paragraphs.push(
        narrativeInlineResult(
          "",
          `ИЗР – ${String(b.workerLoad)}`,
          ` — ${_burnoutResultBandPhrase("worker_load", b.workerLoad)}`,
          { highlightDanger: workerLoadCritical }
        )
      );
    }
  } else {
    paragraphs.push(narrativePlain("Показатели по результатам тестирования определить не удалось."));
  }
  return _section(6, NARRATIVE_SECTION_TITLES.burnout, paragraphs, {
    burnoutTables: BURNOUT_REFERENCE_TABLES,
  });
}

function _buildLocusSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const r = computeRotterScores(answers[8]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_LOCUS_INTRO)];
  if (r.orientation === "internal") {
    paragraphs.push(narrativeHighlight("Высокий уровень ответственности"));
    paragraphs.push(
      narrativePlain(
        "Оцениваемый считает, что его успехи и неудачи в работе главным образом зависят от " +
          "собственных действий, усилий и решений. Он демонстрирует высокую ответственность, " +
          "самодисциплину, инициативность и стремление контролировать ситуацию."
      )
    );
  } else if (r.orientation === "external") {
    paragraphs.push(narrativeHighlight("Низкий уровень ответственности"));
    paragraphs.push(
      narrativePlain(
        "Оцениваемый склонен связывать успехи и неудачи с внешними обстоятельствами, " +
          "действиями других людей или случайностью. Это может снижать проявление инициативы " +
          "и самостоятельности в принятии решений."
      )
    );
  } else if (r.orientation === "balanced") {
    paragraphs.push(narrativeHighlight("Сбалансированный локус контроля"));
    paragraphs.push(
      narrativePlain(
        "Оцениваемый сочетает признание собственной ответственности с учётом внешних факторов " +
          "при оценке результатов деятельности."
      )
    );
  } else {
    paragraphs.push(narrativePlain("Уровень ответственности определить не удалось."));
  }
  return _section(7, NARRATIVE_SECTION_TITLES.locus, paragraphs);
}

function _buildStressTypeSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const t = computeTypeAScores(answers[6]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_STRESS_INTRO)];
  if (t.profile === "type_b" || t.profile === "type_b_tendency") {
    paragraphs.push(narrativeHighlight("Тип Б. Высокая стрессоустойчивость"));
    paragraphs.push(
      narrativePlain(
        t.description ??
          "Оцениваемый обладает высоким потенциалом в борьбе со стресс-факторами, " +
            "использует активные стратегии и конструктивные методы преодоления стресса."
      )
    );
  } else if (t.profile === "type_a" || t.profile === "type_a_tendency") {
    paragraphs.push(
      narrativeHighlight(
        t.profile === "type_a"
          ? "Тип А. Низкая стрессоустойчивость"
          : "Склонность к типу А. Низкая стрессоустойчивость"
      )
    );
    paragraphs.push(
      narrativePlain(
        t.description ??
          "Неустойчивость к стрессам проявляется нередко. При конфликтах или неожиданных " +
            "ситуациях возможен повышенный уровень стресса, что может повлиять на работу " +
            "в коллективе и принятие решений."
      )
    );
  } else {
    paragraphs.push(narrativePlain("Тип стрессоустойчивости определить не удалось."));
  }
  return _section(8, NARRATIVE_SECTION_TITLES.stressType, paragraphs);
}

function _buildRiskSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const s = computeSchubertScores(answers[5]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_RISK_INTRO)];
  if (s.level === "high") {
    paragraphs.push(narrativeHighlight("Высокая склонность к риску"));
    paragraphs.push(
      narrativePlain(
        s.description ??
          "Вероятность предпринять действия, которые могут привести к нежелательной потере " +
            "при плохом стечении обстоятельств, на высоком уровне. Катализатор инноваций, " +
            "но высок риск необдуманных решений."
      )
    );
  } else if (s.level === "low") {
    paragraphs.push(narrativeHighlight("Низкая склонность к риску"));
    paragraphs.push(
      narrativePlain(
        s.description ??
          "Оцениваемый предпочитает предсказуемые решения и избегает ситуаций с высокой неопределённостью."
      )
    );
  } else if (s.level === "mid") {
    paragraphs.push(narrativeHighlight("Средняя склонность к риску"));
    paragraphs.push(
      narrativePlain(
        s.description ??
          "Оцениваемый сочетает осторожность с готовностью к умеренному риску при обоснованных решениях."
      )
    );
  } else {
    paragraphs.push(narrativePlain("Уровень готовности к риску определить не удалось."));
  }
  return _section(9, NARRATIVE_SECTION_TITLES.risk, paragraphs);
}

function _buildMultitaskSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const s = computeSnyderScores(answers[4]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_MULTITASK_INTRO)];
  if (s.level === "high") {
    paragraphs.push(narrativeHighlight("Высокий уровень многозадачности"));
    paragraphs.push(
      narrativePlain(
        "Мобильность в общении и готовность подстраиваться под ситуацию позволяют эффективно " +
          "работать в режиме многозадачности."
      )
    );
  } else if (s.level === "low") {
    paragraphs.push(narrativeHighlight("Низкий уровень многозадачности (выраженная монозадачность)"));
    paragraphs.push(
      narrativePlain(
        "Стабильная модель общения и некоторая ригидность коррелируют с предпочтением " +
          "последовательной работы над одной задачей."
      )
    );
  } else if (s.level === "mid") {
    paragraphs.push(narrativeHighlight("Средний уровень многозадачности"));
    paragraphs.push(
      narrativePlain(
        "Не имеет ярко выраженной моно- или многозадачности, может работать в обоих режимах, " +
          "однако менее эффективно, чем сотрудники с явно выраженной моно- или многозадачностью."
      )
    );
  } else {
    paragraphs.push(narrativePlain("Уровень моно/многозадачности определить не удалось."));
  }
  return _section(10, NARRATIVE_SECTION_TITLES.multitask, paragraphs);
}

function _goalPursuitLevelLabel(sum: number): string {
  if (sum <= 16) {
    return "Низкий уровень целеустремлённости";
  }
  if (sum <= 23) {
    return "Средний уровень целеустремлённости";
  }
  return "Высокий уровень целеустремлённости";
}

function _goalPursuitShortVerdict(sum: number): string {
  if (sum <= 16) {
    return "Оцениваемый не склонен активно ставить и достигать амбициозные цели.";
  }
  if (sum <= 23) {
    return "Оцениваемый берётся за задачи, которые считает посильными, и постепенно расширяет цели.";
  }
  return "Человек может добиваться поставленных целей, иногда даже невзирая на средства.";
}

function _buildGoalSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const g = computeGoalPursuitScores(answers[2]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_GOAL_INTRO)];
  if (g.sum !== null) {
    paragraphs.push(narrativeHighlight(_goalPursuitLevelLabel(g.sum)));
    paragraphs.push(narrativePlain(_goalPursuitShortVerdict(g.sum)));
  } else {
    paragraphs.push(narrativePlain("Уровень целеустремлённости определить не удалось."));
  }
  return _section(11, NARRATIVE_SECTION_TITLES.goalPursuit, paragraphs);
}

function _roweStyleTitle(styleId: RoweStyleId): string {
  const label = ROWE_STYLE_LABELS[styleId];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function _buildCommunicationStyleSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const rowe = computeRoweStyleScores(answers[1]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_ROW_INTRO)];
  if (rowe.dominantStyles.length === 0) {
    paragraphs.push(narrativePlain("Ориентационный стиль определить не удалось."));
    return _section(12, NARRATIVE_SECTION_TITLES.communicationStyle, paragraphs);
  }
  for (const styleId of rowe.dominantStyles) {
    paragraphs.push(narrativeHighlight(_roweStyleTitle(styleId)));
    paragraphs.push(narrativePlain(ROWE_STYLE_INTERPRETATIONS[styleId]));
  }
  return _section(12, NARRATIVE_SECTION_TITLES.communicationStyle, paragraphs);
}

function _buildPaperworkSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const p = computePaperworkScores(answers[3]);
  const paragraphs: AuditReportNarrativeParagraph[] = [narrativePlain(NARRATIVE_PAPERWORK_INTRO)];
  if (p.profiles.length > 0) {
    paragraphs.push(narrativeHighlight(p.profiles.join(" / ")));
    for (const part of p.interpretationParts) {
      paragraphs.push(narrativePlain(part));
    }
  } else if (p.interpretationParts.length > 0) {
    paragraphs.push(narrativeHighlight("Сбалансированный стиль"));
    for (const part of p.interpretationParts) {
      paragraphs.push(narrativePlain(part));
    }
  } else if (p.answered >= 12) {
    paragraphs.push(narrativeHighlight("Выраженный стиль не выявлен"));
  } else {
    paragraphs.push(narrativePlain("Стиль работы с документацией определить не удалось."));
  }
  return _section(13, NARRATIVE_SECTION_TITLES.paperwork, paragraphs);
}

function _adaptabilityLevelTitle(diff: number): string {
  if (diff >= 8) {
    return "Высокий уровень";
  }
  if (diff >= 6) {
    return "Выше среднего";
  }
  if (diff === 5) {
    return "Средний уровень";
  }
  if (diff >= 3) {
    return "Ниже среднего";
  }
  return "Низкий уровень";
}

function _buildAdaptabilitySection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const s = computeStrelyauScores(answers[7]);
  const paragraphs: AuditReportNarrativeParagraph[] = [];
  if (s.diff !== null && s.level !== null) {
    paragraphs.push(narrativeHighlight(_adaptabilityLevelTitle(s.diff)));
    paragraphs.push(narrativePlain(STRELYAU_NARRATIVE_DESCRIPTIONS[s.level]));
  } else {
    paragraphs.push(narrativePlain("Уровень психологической адаптивности определить не удалось."));
  }
  return _section(14, NARRATIVE_SECTION_TITLES.adaptability, paragraphs);
}

function _buildOdReserveNarrativeSections(
  answers: AuditAnswersMap
): ReadonlyArray<AuditReportNarrativeSection> {
  const sections = [
    _buildIntelligenceSection(answers),
    _buildKosSection(answers),
    _buildConflictSection(answers),
    _buildMotivationSection(answers),
    _buildBurnoutSection(answers),
    _buildCommunicationStyleSection(answers),
    _buildGoalSection(answers),
    _buildRiskSection(answers),
    _buildStressTypeSection(answers),
    _buildAdaptabilitySection(answers),
    _buildLocusSection(answers),
    _buildMaslachMbiSection(answers),
  ];
  if (hasSectarianismAnswers(answers)) {
    sections.push(_buildSectarianismSection(answers));
  }
  return sections.map((section, index) => ({
    ...section,
    sectionIndex: index + 1,
  }));
}

/** Блок 0 — ПРОФ СБ; блоки 1–12 — как у батареи ОД / резерва. */
function _buildTuManagementChefNarrativeSections(
  answers: AuditAnswersMap,
  step4Data?: Step4Data
): ReadonlyArray<AuditReportNarrativeSection> {
  const profSbParagraphs =
    step4Data !== undefined
      ? buildStep4AiSummary(step4Data)
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => narrativePlain(line))
      : [
          narrativePlain(
            "Анкета ПРОФ СБ не заполнена или данные не переданы при отправке."
          ),
        ];
  const profSbSection = _section(0, "Анкета ПРОФ СБ", profSbParagraphs);
  const methodologySections = _buildOdReserveNarrativeSections(answers);
  return [profSbSection, ...methodologySections];
}

/** Блок 0 — ПРОФ СБ; блоки 1–5 — методики батареи скрининга кандидата. */
function _buildCandidateScreeningNarrativeSections(
  answers: AuditAnswersMap,
  step4Data?: Step4Data
): ReadonlyArray<AuditReportNarrativeSection> {
  const profSbParagraphs =
    step4Data !== undefined
      ? buildStep4AiSummary(step4Data)
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => narrativePlain(line))
      : [
          narrativePlain(
            "Анкета ПРОФ СБ не заполнена или данные не переданы при отправке."
          ),
        ];
  const profSbSection = _section(0, "Анкета ПРОФ СБ", profSbParagraphs);
  const methodologySections = [
    _buildIntelligenceSection(answers),
    _buildConflictSection(answers),
    _buildMotivationSection(answers),
    _buildBurnoutSection(answers),
    _buildSectarianismSection(answers),
  ].map((section, index) => ({
    ...section,
    sectionIndex: index + 1,
  }));
  return [profSbSection, ...methodologySections];
}

function _buildSectarianismSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const sectarianStep = AUDIT_STEPS.find((s) => s.internalKey === "sectarianism_screening");
  const evaluation = computeSectarianismEvaluation(
    sectarianStep ? answers[sectarianStep.stepIndex] : undefined
  );
  return _section(5, "Тест на выявление сектантства", buildSectarianismHrNarrativeParagraphs(evaluation));
}

function _buildMaslachMbiSection(answers: AuditAnswersMap): AuditReportNarrativeSection {
  const maslachStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_mbi_short");
  const { scores, interpretation } = computeMaslachMbiFromAuditStep(
    maslachStep ? answers[maslachStep.stepIndex] : undefined
  );
  const paragraphs: AuditReportNarrativeParagraph[] = [
    narrativePlain(
      "Опросник профессионального выгорания К. Маслач (MBI) оценивает три стороны состояния: " +
        "эмоциональное истощение, деперсонализацию (отчуждение и цинизм) и ощущение " +
        "профессиональных достижений."
    ),
  ];
  if (scores.ee !== null && scores.dp !== null && scores.pa !== null && interpretation !== null) {
    const managerContent = buildMaslachManagerBriefContent(interpretation);
    for (const scale of managerContent.scales) {
      paragraphs.push(
        narrativeInlineResult("", `${scale.scaleTitle}: ${scale.statusLabel}`, undefined, {
          highlightDanger:
            scale.trafficLight === "red" || scale.trafficLight === "orange",
        })
      );
      paragraphs.push(narrativePlain(`${scale.whatItMeasures} ${scale.managerMeaning}`));
    }
    paragraphs.push(narrativeHighlight(interpretation.verdictTitle));
    paragraphs.push(narrativePlain(managerContent.overallText));
  } else {
    paragraphs.push(narrativePlain("Показатели опросника Маслач определить не удалось."));
  }
  return _section(12, MASLACH_MANAGER_SECTION_TITLE, paragraphs);
}
