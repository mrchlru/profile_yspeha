import type { AuditAnswersMap, AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import {
  buildEmployeeDashboardPreview,
  parseStoredAuditReportJson,
} from "@/lib/admin/buildEmployeeDashboardPreview";
import {
  DASHBOARD_CHART_COLORS,
  dashboardSeriesColor,
} from "@/lib/admin/employeeDashboardTheme";
import type {
  DashboardAlertItem,
  DashboardChartSlice,
  DashboardGauge,
  DashboardKpiCard,
  DashboardMetricBar,
  DashboardRadarSeries,
  DashboardScaleMetric,
  DashboardSectarianSection,
  DashboardTestCard,
  EmployeeDashboardVisual,
} from "@/lib/admin/employeeDashboardTypes";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";
import {
  computeGerchikovProfile,
  computeGoalPursuitScores,
  computeKosScores,
  computePaperworkScores,
  computePochebutScores,
  computeRotterScores,
  computeRoweStyleScores,
  computeSchubertScores,
  computeSnyderScores,
  computeStrelyauScores,
  computeThomasKilmannScores,
  computeToleranceScores,
  computeTypeAScores,
  gerchikovTypeLabel,
  pochebutLevelLabel,
  kosLevelLabel,
  roweDominantStyleLabel,
  thomasKilmannStyleLabel,
  type GerchikovProfile,
  type GoalPursuitScores,
  type KosScores,
  type PaperworkGroupScores,
  type PochebutScores,
  type RotterScores,
  type RoweStyleScores,
  type SchubertScores,
  type SnyderScores,
  type StrelyauScores,
  type ThomasKilmannScores,
  type ToleranceFactorScores,
  type TypeAScores,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import { computeCfitTotals, type CfitTotals } from "@/lib/audit/report/computeCfitTotals";
import {
  burnoutBand,
  burnoutBandLabel,
  computeBurnoutScores,
  type BurnoutScores,
} from "@/lib/audit/report/computeMbiStep19";
import { extractMetricsFromStoredAuditReport } from "@/lib/audit/report/buildAuditReportData";
import {
  computeRukavishnikovWorkerLoadFromSums,
  RUKAVISHNIKOV_IPV_SUM_MAX,
  RUKAVISHNIKOV_WORKER_LOAD_INDEX_SHORT,
  RUKAVISHNIKOV_WORKER_LOAD_FORMULA_TEXT,
  RUKAVISHNIKOV_WORKER_LOAD_SCALE_MAX,
} from "@/lib/audit/report/computeRukavishnikovWorkerLoadIndex";
import {
  computeSectarianismEvaluation,
  formatSectarianismPercent,
  type SectarianismEvaluation,
} from "@/lib/audit/report/computeSectarianismScores";
import { parseAuditAnswersPayload } from "@/lib/audit/report/parseAuditAnswersPayload";
import {
  gerchikovStep2ToAuditAnswers,
  type GerchikovStep2Data,
} from "@/lib/gerchikov/step2Types";
import type {
  GerchikovMotivationType,
  PochebutLoyaltyLevel,
  RukavishnikovBandLevel,
  ThomasKilmannStyle,
} from "@/lib/audit/report/keys/auditScoringKeys";
import {
  RUKAVISHNIKOV_LO_ITEMS,
  RUKAVISHNIKOV_PI_ITEMS,
  RUKAVISHNIKOV_PM_ITEMS,
} from "@/lib/audit/report/keys/auditScoringKeys";

const BURNOUT_PI_MAX = RUKAVISHNIKOV_PI_ITEMS.length * 3;
const BURNOUT_LO_MAX = RUKAVISHNIKOV_LO_ITEMS.length * 3;
const BURNOUT_PM_MAX = RUKAVISHNIKOV_PM_ITEMS.length * 3;
const BURNOUT_IPV_MAX = RUKAVISHNIKOV_IPV_SUM_MAX;
const BURNOUT_WORKER_LOAD_MAX = RUKAVISHNIKOV_WORKER_LOAD_SCALE_MAX;

const GERCHIKOV_TYPE_ORDER: ReadonlyArray<GerchikovMotivationType> = ["IN", "PR", "PA", "HO", "ST"];

/** Подписи осей радара Герчикова (5 типов мотивации). */
const GERCHIKOV_RADAR_LABELS: Readonly<Record<GerchikovMotivationType, string>> = {
  IN: "Инструментальный",
  PR: "Профессиональный",
  PA: "Патриотический",
  HO: "Хозяйский",
  ST: "Странник",
};
const THOMAS_STYLE_ORDER: ReadonlyArray<ThomasKilmannStyle> = [
  "competing",
  "collaborating",
  "compromising",
  "avoiding",
  "accommodating",
];

/** Нормализованная тяжесть ПИ (0..100): чем выше, тем сильнее истощение. */
const BURNOUT_BAND_PI_SEVERITY: Readonly<Record<RukavishnikovBandLevel, number>> = {
  extremely_low: 8,
  low: 24,
  mid: 44,
  high: 68,
  extremely_high: 86,
};

const POCHEBUT_LEVEL_PERCENT: Readonly<Record<PochebutLoyaltyLevel, number>> = {
  very_low: 15,
  low: 35,
  mid: 60,
  high: 88,
};

export type AuditDashboardSource = {
  sessionId: string;
  sessionLabel: string;
  createdAt: string;
  auditReport: unknown;
  answers: unknown;
  /** Ответы Герчикова из legacy-скрининга (step2), если в audit.answers нет шага 21. */
  screeningStep2Data: unknown | null;
  previous: {
    sessionId: string;
    sessionLabel: string;
    answers: unknown;
    auditReport: unknown;
    screeningStep2Data?: unknown | null;
  } | null;
};

type MethodologyBundle = {
  rowe: RoweStyleScores | null;
  goal: GoalPursuitScores | null;
  paperwork: PaperworkGroupScores | null;
  snyder: SnyderScores | null;
  schubert: SchubertScores | null;
  typeA: TypeAScores | null;
  strelyau: StrelyauScores | null;
  rotter: RotterScores | null;
  tolerance: ToleranceFactorScores | null;
  cfit: CfitTotals | null;
  thomas: ThomasKilmannScores | null;
  gerchikov: GerchikovProfile | null;
  pochebut: PochebutScores | null;
  kos: KosScores | null;
  burnout: BurnoutScores | null;
  sectarian: SectarianismEvaluation | null;
};

/**
 * Собирает структуру визуального дашборда из отчёта и сырых ответов.
 */
export function buildEmployeeDashboardVisual(
  source: AuditDashboardSource | null
): EmployeeDashboardVisual {
  if (source === null) {
    return _emptyVisual();
  }

  const report = parseStoredAuditReportJson(source.auditReport);
  const preview = buildEmployeeDashboardPreview(report);
  const previousReport = source.previous
    ? parseStoredAuditReportJson(source.previous.auditReport)
    : null;
  const answers = _enrichAnswersWithGerchikovFallback(
    _parseAnswers(source.answers),
    source.screeningStep2Data
  );
  const previousAnswers = source.previous
    ? _enrichAnswersWithGerchikovFallback(
        _parseAnswers(source.previous.answers),
        source.previous.screeningStep2Data ?? null
      )
    : null;

  const currentBundle = _computeMethodologies(answers);
  const previousBundle = previousAnswers ? _computeMethodologies(previousAnswers) : null;
  const current = {
    ...currentBundle,
    burnout: _resolveBurnoutScores(answers, report) ?? currentBundle.burnout,
  };
  const previous =
    previousBundle !== null
      ? {
          ...previousBundle,
          burnout: _resolveBurnoutScores(previousAnswers, previousReport) ?? previousBundle.burnout,
        }
      : null;
  const currentGerchikov =
    _resolveGerchikovProfile(answers, report) ?? current.gerchikov;
  const previousGerchikov =
    previousAnswers !== null
      ? (_resolveGerchikovProfile(previousAnswers, previousReport) ?? previous?.gerchikov ?? null)
      : null;
  const scaleProfile = _buildScaleProfile(current, previous);
  const profileMetrics = scaleProfile.filter((metric) => metric.key !== "motivation");

  return {
    sessionId: source.sessionId,
    sessionLabel: source.sessionLabel,
    previousSessionLabel: source.previous?.sessionLabel ?? null,
    hasData: report !== null || scaleProfile.length > 0,
    hasPrevious: previous !== null,
    criticalAlerts: _buildCriticalAlerts(report),
    kpiCards: _buildKpiCards(current, previous),
    radar: _buildGerchikovRadar(currentGerchikov, previousGerchikov),
    gauges: _buildGauges(scaleProfile),
    profileMetrics,
    testCards: _buildTestCards(current, previous),
    strengths: _rankZones(scaleProfile, "top"),
    growthZones: _rankZones(scaleProfile, "bottom"),
    intelligence: _buildIntelligenceCard(current.cfit, previous?.cfit ?? null, report),
    yoy: _buildYoYChart(report),
    profileSummary: preview.profileSummary,
    motivationSummary: preview.applicableMotivation,
    sectarianSection: _buildSectarianSection(current, previous),
  };
}

function _computeMethodologies(answers: AuditAnswersMap | null): MethodologyBundle {
  if (answers === null) {
    return _emptyBundle();
  }
  const rowe = computeRoweStyleScores(_stepAnswers(answers, "rowe_decision_styles"));
  const goal = computeGoalPursuitScores(_stepAnswers(answers, "goal_pursuit_short"));
  const paperwork = computePaperworkScores(_stepAnswers(answers, "paperwork_style_short"));
  const snyder = computeSnyderScores(_stepAnswers(answers, "snyder_self_monitoring"));
  const schubert = computeSchubertScores(_stepAnswers(answers, "schubert_risk_full"));
  const typeA = computeTypeAScores(_stepAnswers(answers, "type_a_jenkins_short"));
  const strelyau = computeStrelyauScores(_stepAnswers(answers, "strelyau_temperament_short"));
  const rotter = computeRotterScores(_stepAnswers(answers, "rotter_locus"));
  const tolerance = computeToleranceScores(_stepAnswers(answers, "tolerance_likert7_33"));
  const cfit = computeCfitTotals(answers);
  const thomas = computeThomasKilmannScores(_stepAnswers(answers, "thomas_kilmann_conflict"));
  const gerchikov = computeGerchikovProfile(_stepAnswers(answers, "gerchikov_motivation_full"));
  const pochebut = computePochebutScores(_stepAnswers(answers, "pochebut_loyalty"));
  const kos = computeKosScores(_stepAnswers(answers, "kos_communicative_organizational"));
  const burnout = computeBurnoutScores(_stepAnswers(answers, "maslach_burnout"));
  const sectarian = computeSectarianismEvaluation(_stepAnswers(answers, "sectarianism_screening"));

  return {
    rowe: rowe.pairsAnswered > 0 ? rowe : null,
    goal: goal.answered > 0 ? goal : null,
    paperwork: paperwork.answered > 0 ? paperwork : null,
    snyder: snyder.answered > 0 ? snyder : null,
    schubert: schubert.answered > 0 ? schubert : null,
    typeA: typeA.answered > 0 ? typeA : null,
    strelyau: strelyau.answered > 0 ? strelyau : null,
    rotter: rotter.answered > 0 ? rotter : null,
    tolerance: tolerance.answered > 0 ? tolerance : null,
    cfit: cfit.answeredTotal > 0 ? cfit : null,
    thomas: thomas.answered > 0 ? thomas : null,
    gerchikov: gerchikov.answerSlots > 0 ? gerchikov : null,
    pochebut: pochebut.answered > 0 ? pochebut : null,
    kos: kos.answered > 0 ? kos : null,
    burnout: burnout.answeredCount > 0 ? burnout : null,
    sectarian: sectarian.answeredCount > 0 ? sectarian : null,
  };
}

function _emptyBundle(): MethodologyBundle {
  return {
    rowe: null,
    goal: null,
    paperwork: null,
    snyder: null,
    schubert: null,
    typeA: null,
    strelyau: null,
    rotter: null,
    tolerance: null,
    cfit: null,
    thomas: null,
    gerchikov: null,
    pochebut: null,
    kos: null,
    burnout: null,
    sectarian: null,
  };
}

function _stepAnswers(
  answers: AuditAnswersMap,
  internalKey: string
): AuditStepAnswers | undefined {
  const step = AUDIT_STEPS.find((item) => item.internalKey === internalKey);
  return step ? answers[step.stepIndex] : undefined;
}

function _emptyVisual(): EmployeeDashboardVisual {
  return {
    sessionId: null,
    sessionLabel: null,
    previousSessionLabel: null,
    hasData: false,
    hasPrevious: false,
    criticalAlerts: [],
    kpiCards: [],
    radar: null,
    gauges: [],
    profileMetrics: [],
    testCards: [],
    strengths: [],
    growthZones: [],
    intelligence: null,
    yoy: null,
    profileSummary: "Профиль пока не сформирован.",
    motivationSummary: "Нет данных скрининга.",
    sectarianSection: null,
  };
}

function _parseAnswers(value: unknown): AuditAnswersMap | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  try {
    return parseAuditAnswersPayload(value as Record<string, Record<string, unknown>>);
  } catch {
    return null;
  }
}

function _clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function _levelLabel(percent: number): string {
  if (percent >= 70) {
    return "высокий";
  }
  if (percent >= 40) {
    return "средний";
  }
  return "низкий";
}

function _bandLevelToPercent(level: "low" | "mid" | "high" | null): number | null {
  if (level === null) {
    return null;
  }
  if (level === "low") {
    return 25;
  }
  if (level === "mid") {
    return 55;
  }
  return 85;
}

/** Линейная нормализация сырого балла в 0..100 по диапазону [min, max]. */
function _normalizeLinear(value: number, min: number, max: number): number {
  if (max <= min) {
    return 50;
  }
  return _clampPercent(((value - min) / (max - min)) * 100);
}

function _buildScaleProfile(
  current: MethodologyBundle,
  previous: MethodologyBundle | null
): ReadonlyArray<DashboardScaleMetric> {
  const metrics: DashboardScaleMetric[] = [];

  if (current.cfit && current.cfit.iq !== null) {
    const value = _normalizeLinear(current.cfit.iq, 70, 130);
    const prev = previous?.cfit?.iq ?? null;
    metrics.push(_scaleMetric("intelligence", "Интеллект", value, prev !== null ? _normalizeLinear(prev, 70, 130) : null, `IQ ${String(current.cfit.iq)}`, prev !== null ? `IQ ${String(prev)}` : null));
  }

  if (current.typeA && current.typeA.sum !== null) {
    const value = _clampPercent(100 - _normalizeLinear(current.typeA.sum, 0, 40));
    const prev = previous?.typeA?.sum ?? null;
    metrics.push(_scaleMetric(
      "stress",
      "Стрессоустойчивость (тип А/Б)",
      value,
      prev !== null ? _clampPercent(100 - _normalizeLinear(prev, 0, 40)) : null,
      current.typeA.bandLabel ?? `${String(current.typeA.sum)} баллов`,
      previous?.typeA?.bandLabel ?? (prev !== null ? `${String(prev)} баллов` : null)
    ));
  }

  if (current.burnout && current.burnout.piBand !== null && current.burnout.pi !== null) {
    const value = BURNOUT_BAND_PI_SEVERITY[current.burnout.piBand];
    const prevBand = previous?.burnout?.piBand ?? null;
    const prevValue = prevBand !== null ? BURNOUT_BAND_PI_SEVERITY[prevBand] : null;
    metrics.push(_scaleMetric(
      "burnout_pi",
      "Психоэмоциональное истощение (ПИ)",
      value,
      prevValue,
      `ПИ ${String(current.burnout.pi)}`,
      previous?.burnout?.pi !== undefined && previous?.burnout?.pi !== null
        ? `ПИ ${String(previous.burnout.pi)}`
        : null,
      burnoutBandLabel("pi", current.burnout.pi),
      false
    ));
  }

  if (current.schubert && current.schubert.sum !== null) {
    const value = _normalizeLinear(current.schubert.sum, -50, 50);
    const prev = previous?.schubert?.sum ?? null;
    metrics.push(_scaleMetric("risk", "Готовность к риску", value, prev !== null ? _normalizeLinear(prev, -50, 50) : null, `${String(current.schubert.sum)} баллов`, prev !== null ? `${String(prev)} баллов` : null));
  }

  if (current.goal && current.goal.sum !== null) {
    const value = _normalizeLinear(current.goal.sum, 10, 30);
    const prev = previous?.goal?.sum ?? null;
    metrics.push(_scaleMetric("purposefulness", "Целеустремлённость", value, prev !== null ? _normalizeLinear(prev, 10, 30) : null, `${String(current.goal.sum)} баллов`, prev !== null ? `${String(prev)} баллов` : null));
  }

  if (current.strelyau && current.strelyau.diff !== null) {
    const value = _normalizeLinear(current.strelyau.diff, -5, 12);
    const prev = previous?.strelyau?.diff ?? null;
    metrics.push(_scaleMetric("adaptability", "Адаптивность", value, prev !== null ? _normalizeLinear(prev, -5, 12) : null, `${String(current.strelyau.diff)} баллов`, prev !== null ? `${String(prev)} баллов` : null));
  }

  if (current.rotter && current.rotter.internal !== null) {
    const value = _normalizeLinear(current.rotter.internal, 0, 23);
    const prev = previous?.rotter?.internal ?? null;
    metrics.push(_scaleMetric("locus", "Локус контроля (интернальность)", value, prev !== null ? _normalizeLinear(prev, 0, 23) : null, `${String(current.rotter.internal)} из 23`, prev !== null ? `${String(prev)} из 23` : null));
  }

  if (current.thomas) {
    const total = THOMAS_STYLE_ORDER.reduce(
      (sum, style) => sum + current.thomas!.counts[style],
      0
    );
    const cooperation =
      current.thomas.counts.collaborating + current.thomas.counts.compromising;
    const value = total > 0 ? _clampPercent((cooperation / total) * 100) : 0;
    const prev = previous?.thomas ?? null;
    const prevTotal = prev
      ? THOMAS_STYLE_ORDER.reduce((sum, style) => sum + prev.counts[style], 0)
      : 0;
    const prevCoop = prev ? prev.counts.collaborating + prev.counts.compromising : 0;
    const prevValue = prev && prevTotal > 0 ? _clampPercent((prevCoop / prevTotal) * 100) : null;
    metrics.push(_scaleMetric("conflict", "Конструктивное поведение в конфликте", value, prevValue, `${String(cooperation)} из ${String(total)}`, prev ? `${String(prevCoop)} из ${String(prevTotal)}` : null));
  }

  if (current.kos && current.kos.commK !== null) {
    const value = _clampPercent(current.kos.commK * 100);
    const prev = previous?.kos?.commK ?? null;
    metrics.push(_scaleMetric("communication", "Коммуникативные склонности", value, prev !== null ? _clampPercent(prev * 100) : null, `K ${current.kos.commK.toFixed(2)}`, prev !== null ? `K ${prev.toFixed(2)}` : null));
  }

  if (current.kos && current.kos.orgK !== null) {
    const value = _clampPercent(current.kos.orgK * 100);
    const prev = previous?.kos?.orgK ?? null;
    metrics.push(_scaleMetric("organization", "Организаторские склонности", value, prev !== null ? _clampPercent(prev * 100) : null, `K ${current.kos.orgK.toFixed(2)}`, prev !== null ? `K ${prev.toFixed(2)}` : null));
  }

  if (current.gerchikov) {
    const counts = current.gerchikov.counts;
    const total = GERCHIKOV_TYPE_ORDER.reduce((sum, type) => sum + counts[type], 0);
    const constructive = total - counts.ST;
    const value = total > 0 ? _clampPercent((constructive / total) * 100) : 0;
    const prev = previous?.gerchikov ?? null;
    const prevCounts = prev?.counts;
    const prevTotal = prevCounts
      ? GERCHIKOV_TYPE_ORDER.reduce((sum, type) => sum + prevCounts[type], 0)
      : 0;
    const prevConstructive = prevCounts ? prevTotal - prevCounts.ST : 0;
    const prevValue = prev && prevTotal > 0 ? _clampPercent((prevConstructive / prevTotal) * 100) : null;
    metrics.push(_scaleMetric("motivation", "Конструктивная мотивация", value, prevValue, `${String(constructive)} из ${String(total)}`, prev ? `${String(prevConstructive)} из ${String(prevTotal)}` : null));
  }

  if (current.pochebut && current.pochebut.level !== null) {
    const value = POCHEBUT_LEVEL_PERCENT[current.pochebut.level];
    const prevLevel = previous?.pochebut?.level ?? null;
    const prevValue = prevLevel !== null ? POCHEBUT_LEVEL_PERCENT[prevLevel] : null;
    metrics.push(_scaleMetric("loyalty", "Лояльность (Почебут)", value, prevValue, pochebutLevelLabel(current.pochebut.level), prevLevel !== null ? pochebutLevelLabel(prevLevel) : null));
  }

  if (current.snyder && current.snyder.score !== null) {
    const value = _normalizeLinear(current.snyder.score, 0, 25);
    const prev = previous?.snyder?.score ?? null;
    metrics.push(_scaleMetric("selfmonitoring", "Самоконтроль (Снайдер)", value, prev !== null ? _normalizeLinear(prev, 0, 25) : null, `${String(current.snyder.score)} из 25`, prev !== null ? `${String(prev)} из 25` : null));
  }

  if (current.sectarian && current.sectarian.complete) {
    const maxScore = current.sectarian.hrProfileRows.reduce(
      (max, row) => (row.scorePercent > max ? row.scorePercent : max),
      0
    );
    const value = _clampPercent(100 - maxScore);
    const prevMax = previous?.sectarian?.complete
      ? previous.sectarian.hrProfileRows.reduce(
          (max, row) => (row.scorePercent > max ? row.scorePercent : max),
          0
        )
      : null;
    metrics.push(_scaleMetric("reliability", "Благонадёжность", value, prevMax !== null ? _clampPercent(100 - prevMax) : null, `риск ${formatSectarianismPercent(maxScore)}%`, prevMax !== null ? `риск ${formatSectarianismPercent(prevMax)}%` : null));
  }

  return metrics;
}

function _scaleMetric(
  key: string,
  label: string,
  value: number,
  previousValue: number | null,
  rawText: string,
  previousRawText: string | null,
  levelLabel?: string,
  higherIsBetter = true
): DashboardScaleMetric {
  const delta = previousValue !== null ? value - previousValue : null;
  return {
    key,
    label,
    value,
    previousValue,
    rawText,
    previousRawText,
    levelLabel: levelLabel ?? _levelLabel(value),
    delta,
    higherIsBetter,
  };
}

function _buildGerchikovRadar(
  current: GerchikovProfile | null,
  previous: GerchikovProfile | null
): EmployeeDashboardVisual["radar"] {
  if (current === null) {
    return null;
  }
  const totalCounts = GERCHIKOV_TYPE_ORDER.reduce((sum, type) => sum + current.counts[type], 0);
  if (current.answerSlots === 0 && totalCounts === 0) {
    return null;
  }

  const axes = GERCHIKOV_TYPE_ORDER.map((type) => GERCHIKOV_RADAR_LABELS[type]);
  const currentValues = GERCHIKOV_TYPE_ORDER.map((type) => ({
    axis: GERCHIKOV_RADAR_LABELS[type],
    value: _gerchikovTypePercent(current, type),
  }));

  const series: DashboardRadarSeries[] = [
    {
      key: "current",
      label: "Текущий период",
      color: DASHBOARD_CHART_COLORS.current,
      values: currentValues,
    },
  ];

  if (previous !== null) {
    const prevTotal = GERCHIKOV_TYPE_ORDER.reduce((sum, type) => sum + previous.counts[type], 0);
    if (previous.answerSlots > 0 || prevTotal > 0) {
      series.push({
        key: "previous",
        label: "Прошлый период",
        color: DASHBOARD_CHART_COLORS.previous,
        values: GERCHIKOV_TYPE_ORDER.map((type) => ({
          axis: GERCHIKOV_RADAR_LABELS[type],
          value: _gerchikovTypePercent(previous, type),
        })),
      });
    }
  }

  return { axes, series };
}

/** Доля типа мотивации в процентах (0..100). */
function _gerchikovTypePercent(profile: GerchikovProfile, type: GerchikovMotivationType): number {
  const index = profile.indices[type];
  if (index !== undefined) {
    return _clampPercent(index * 100);
  }
  const total = GERCHIKOV_TYPE_ORDER.reduce((sum, t) => sum + profile.counts[t], 0);
  if (total === 0) {
    return 0;
  }
  return _clampPercent((profile.counts[type] / total) * 100);
}

/**
 * Подмешивает step2 скрининга в шаг 21, если в audit.answers Герчикова нет.
 */
function _enrichAnswersWithGerchikovFallback(
  answers: AuditAnswersMap | null,
  screeningStep2Data: unknown | null
): AuditAnswersMap | null {
  if (answers === null && screeningStep2Data === null) {
    return null;
  }
  const map: AuditAnswersMap = { ...(answers ?? {}) };
  const existing = map[21];
  const existingProfile = computeGerchikovProfile(existing);
  if (existingProfile.answerSlots > 0) {
    return map;
  }
  if (screeningStep2Data !== null && typeof screeningStep2Data === "object") {
    map[21] = gerchikovStep2ToAuditAnswers(screeningStep2Data as GerchikovStep2Data);
  }
  return map;
}

/**
 * Восстанавливает профиль Герчикова: сначала из сырых ответов, затем из JSON отчёта.
 */
function _resolveGerchikovProfile(
  answers: AuditAnswersMap | null,
  report: AuditReportJson | null
): GerchikovProfile | null {
  if (answers !== null) {
    const direct = computeGerchikovProfile(answers[21]);
    if (direct.answerSlots > 0) {
      return direct;
    }
    const byKey = computeGerchikovProfile(_stepAnswers(answers, "gerchikov_motivation_full"));
    if (byKey.answerSlots > 0) {
      return byKey;
    }
  }
  return _parseGerchikovFromReport(report);
}

/** Парсит баллы Герчикова из сохранённого блока отчёта. */
function _parseGerchikovFromReport(report: AuditReportJson | null): GerchikovProfile | null {
  if (report === null) {
    return null;
  }
  const block = report.testBlocks.find(
    (item) =>
      item.internalKeys.includes("gerchikov_motivation_full") ||
      item.title.toLowerCase().includes("герчиков") ||
      item.title.toLowerCase().includes("мотивац")
  );
  if (block === undefined) {
    return null;
  }

  const counts: Record<GerchikovMotivationType, number> = {
    IN: 0,
    PR: 0,
    PA: 0,
    HO: 0,
    ST: 0,
  };
  let answerSlots = 0;

  for (const line of block.results) {
    const slotsMatch = line.match(/Проскорено ответов \(кодов\):\s*(\d+)/);
    if (slotsMatch !== null) {
      answerSlots = Number(slotsMatch[1]);
      continue;
    }
    for (const type of GERCHIKOV_TYPE_ORDER) {
      const label = gerchikovTypeLabel(type);
      if (!line.startsWith(label)) {
        continue;
      }
      const countMatch = line.match(/:\s*(\d+),/);
      if (countMatch !== null) {
        counts[type] = Number(countMatch[1]);
      }
    }
  }

  const totalCounts = GERCHIKOV_TYPE_ORDER.reduce((sum, type) => sum + counts[type], 0);
  if (answerSlots === 0) {
    answerSlots = totalCounts;
  }
  if (answerSlots === 0 && totalCounts === 0) {
    return null;
  }

  const indices: Partial<Record<GerchikovMotivationType, number>> = {};
  for (const type of GERCHIKOV_TYPE_ORDER) {
    indices[type] = counts[type] / answerSlots;
  }

  return { counts, answerSlots, indices, ranks: {} };
}

function _buildGauges(
  scaleProfile: ReadonlyArray<DashboardScaleMetric>
): ReadonlyArray<DashboardGauge> {
  const gaugeKeys = ["stress", "burnout_pi", "adaptability", "purposefulness", "risk", "communication"];
  const gaugeLabels: Readonly<Record<string, string>> = {
    stress: "Стрессоустойчивость (тип А/Б)",
    burnout_pi: "Псих. истощение (ПИ)",
  };
  const palette = [
    DASHBOARD_CHART_COLORS.brand,
    DASHBOARD_CHART_COLORS.coral,
    DASHBOARD_CHART_COLORS.blue,
    DASHBOARD_CHART_COLORS.amber,
    DASHBOARD_CHART_COLORS.coral,
    DASHBOARD_CHART_COLORS.brandDark,
  ];
  return scaleProfile
    .filter((metric) => gaugeKeys.includes(metric.key))
    .map((metric, index) => {
      const higherIsBetter = metric.higherIsBetter !== false;
      return {
        label: gaugeLabels[metric.key] ?? metric.label,
        percent: metric.value,
        color:
          (higherIsBetter ? metric.value < 40 : metric.value >= 60)
            ? DASHBOARD_CHART_COLORS.danger
            : palette[index % palette.length]!,
        caption: [metric.levelLabel, metric.rawText]
          .filter((part) => part.trim().length > 0)
          .join(" · "),
        deltaPercent: metric.delta,
      };
    });
}

function _rankZones(
  scaleProfile: ReadonlyArray<DashboardScaleMetric>,
  mode: "top" | "bottom"
): ReadonlyArray<DashboardScaleMetric> {
  const ranked = [...scaleProfile].sort((a, b) =>
    mode === "top" ? b.value - a.value : a.value - b.value
  );
  return ranked.slice(0, 5);
}

function _buildKpiCards(
  current: MethodologyBundle,
  previous: MethodologyBundle | null
): ReadonlyArray<DashboardKpiCard> {
  const cards: DashboardKpiCard[] = [];

  if (current.cfit && current.cfit.iq !== null) {
    const prevIq = previous?.cfit?.iq ?? null;
    cards.push({
      label: "Кэттелл (CFIT)",
      valueText: `${String(current.cfit.iq)} IQ`,
      sublabel: "Норма 85–115",
      deltaPercent: prevIq !== null ? current.cfit.iq - prevIq : null,
      deltaGood: prevIq !== null ? current.cfit.iq >= prevIq : null,
      accent: "brand",
    });
  }

  if (current.kos && current.kos.commK !== null) {
    const value = Math.round(current.kos.commK * 100);
    const prev = previous?.kos?.commK ?? null;
    cards.push({
      label: "Коммуникативные склонности",
      valueText: `${String(value)}%`,
      sublabel: `Уровень: ${kosLevelLabel(current.kos.commLevel)}`,
      deltaPercent: prev !== null ? value - Math.round(prev * 100) : null,
      deltaGood: prev !== null ? value >= Math.round(prev * 100) : null,
      accent: "blue",
    });
  }

  if (current.thomas) {
    const total = THOMAS_STYLE_ORDER.reduce(
      (sum, style) => sum + current.thomas!.counts[style],
      0
    );
    const cooperation =
      current.thomas.counts.collaborating + current.thomas.counts.compromising;
    const value = total > 0 ? Math.round((cooperation / total) * 100) : 0;
    const prev = previous?.thomas ?? null;
    const prevTotal = prev
      ? THOMAS_STYLE_ORDER.reduce((sum, style) => sum + prev.counts[style], 0)
      : 0;
    const prevCoop = prev ? prev.counts.collaborating + prev.counts.compromising : 0;
    const prevValue = prev && prevTotal > 0 ? Math.round((prevCoop / prevTotal) * 100) : null;
    cards.push({
      label: "Поведение в конфликте",
      valueText: `${String(value)}%`,
      sublabel: `Стиль: ${thomasKilmannStyleLabel(current.thomas.dominant)}`,
      deltaPercent: prevValue !== null ? value - prevValue : null,
      deltaGood: prevValue !== null ? value >= prevValue : null,
      accent: "coral",
    });
  }

  if (current.burnout && current.burnout.workerLoad !== null) {
    const critical =
      current.burnout.piBand === "high" ||
      current.burnout.piBand === "extremely_high" ||
      current.burnout.workerLoadBand === "high" ||
      current.burnout.workerLoadBand === "extremely_high";
    const prev = previous?.burnout?.workerLoad ?? null;
    const loadLabel = burnoutBandLabel("worker_load", current.burnout.workerLoad);
    cards.push({
      label: RUKAVISHNIKOV_WORKER_LOAD_INDEX_SHORT,
      valueText: `${String(current.burnout.workerLoad)}`,
      sublabel: loadLabel,
      deltaPercent: prev !== null ? current.burnout.workerLoad - prev : null,
      deltaGood: prev !== null ? current.burnout.workerLoad <= prev : null,
      accent: critical ? "danger" : "amber",
    });
  }

  if (current.sectarian && current.sectarian.complete) {
    const maxScore = current.sectarian.hrProfileRows.reduce(
      (max, row) => (row.scorePercent > max ? row.scorePercent : max),
      0
    );
    const value = 100 - maxScore;
    const prevMax = previous?.sectarian?.complete
      ? previous.sectarian.hrProfileRows.reduce(
          (max, row) => (row.scorePercent > max ? row.scorePercent : max),
          0
        )
      : null;
    cards.push({
      label: "Благонадёжность",
      valueText: `${String(value)}%`,
      sublabel: current.sectarian.anyDetected ? "Выявлены признаки" : "Риск не выявлен",
      deltaPercent: prevMax !== null ? value - (100 - prevMax) : null,
      deltaGood: prevMax !== null ? value >= 100 - prevMax : null,
      accent: current.sectarian.anyDetected ? "danger" : "brand",
    });
  }

  return cards;
}

function _buildCriticalAlerts(report: AuditReportJson | null): ReadonlyArray<DashboardAlertItem> {
  if (report === null) {
    return [];
  }

  const alerts: DashboardAlertItem[] = [];

  if (report.burnoutPiAlert?.critical === true) {
    alerts.push({
      title: "Критическое психоэмоциональное истощение",
      detail: `ПИ = ${report.burnoutPiAlert.score !== null ? String(report.burnoutPiAlert.score) : "—"}`,
      severity: "danger",
    });
  }

  for (const line of report.managerBrief.testLines) {
    if (line.alertHeadline) {
      alerts.push({
        title: line.alertHeadline,
        detail: line.alertFootnote ?? line.briefAnswer,
        severity: "danger",
      });
      continue;
    }
    if (line.danger) {
      alerts.push({
        title: line.title,
        detail: line.briefAnswer || "Требует внимания HR",
        severity: "danger",
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Критические показатели не выявлены",
      detail: "По результатам тестирования существенных рисков не обнаружено.",
      severity: "info",
    });
  }

  return alerts;
}

function _buildTestCards(
  current: MethodologyBundle,
  previous: MethodologyBundle | null
): ReadonlyArray<DashboardTestCard> {
  const cards: DashboardTestCard[] = [];

  if (current.rowe) {
    cards.push(_testCard(
      "rowe",
      "Стили принятия решений (Роу)",
      "Тест 1 · Роу",
      null,
      null,
      roweDominantStyleLabel(current.rowe.dominantStyle),
      previous?.rowe ? roweDominantStyleLabel(previous.rowe.dominantStyle) : null,
      null,
      false,
      null,
      _roweBars(current.rowe),
      null
    ));
  }

  if (current.goal) {
    const value = _bandLevelToPercent(current.goal.level);
    cards.push(_testCard(
      "goal",
      "Целеустремлённость",
      "Тест 2 · Целеустремлённость",
      value,
      previous?.goal ? _bandLevelToPercent(previous.goal.level) : null,
      current.goal.bandLabel ?? `${String(current.goal.sum ?? "—")} баллов`,
      previous?.goal?.bandLabel ?? null,
      current.goal.level,
      false,
      null,
      null,
      current.goal.description
    ));
  }

  if (current.paperwork) {
    cards.push(_testCard(
      "paperwork",
      "Стиль исполнительской деятельности",
      "Тест 3 · Бумажно-карандашный",
      null,
      null,
      current.paperwork.profiles.join(", ") || "—",
      previous?.paperwork ? previous.paperwork.profiles.join(", ") || "—" : null,
      null,
      false,
      null,
      _paperworkBars(current.paperwork),
      current.paperwork.interpretationParts.join(" ") || null
    ));
  }

  if (current.snyder) {
    const value = current.snyder.score !== null ? _normalizeLinear(current.snyder.score, 0, 25) : null;
    cards.push(_testCard(
      "snyder",
      "Самоконтроль поведения (Снайдер)",
      "Тест 4 · ОСКСВО",
      value,
      previous?.snyder?.score !== null && previous?.snyder?.score !== undefined ? _normalizeLinear(previous.snyder.score, 0, 25) : null,
      current.snyder.bandLabel ?? `${String(current.snyder.score ?? "—")} из 25`,
      previous?.snyder?.bandLabel ?? null,
      current.snyder.level,
      false,
      null,
      null,
      current.snyder.description
    ));
  }

  if (current.schubert) {
    const value = current.schubert.sum !== null ? _normalizeLinear(current.schubert.sum, -50, 50) : null;
    cards.push(_testCard(
      "schubert",
      "Готовность к риску (Шуберт)",
      "Тест 5 · Шуберт",
      value,
      previous?.schubert?.sum !== null && previous?.schubert?.sum !== undefined ? _normalizeLinear(previous.schubert.sum, -50, 50) : null,
      current.schubert.bandLabel ?? `${String(current.schubert.sum ?? "—")} баллов`,
      previous?.schubert?.bandLabel ?? null,
      current.schubert.level,
      false,
      null,
      null,
      current.schubert.description
    ));
  }

  if (current.typeA) {
    cards.push(_testCard(
      "typea",
      "Поведенческий тип (Дженкинс)",
      "Тест 6 · Тип А/Б",
      null,
      null,
      current.typeA.bandLabel ?? `${String(current.typeA.sum ?? "—")} баллов`,
      previous?.typeA?.bandLabel ?? null,
      null,
      false,
      null,
      null,
      current.typeA.description
    ));
  }

  if (current.strelyau) {
    const value = current.strelyau.diff !== null ? _normalizeLinear(current.strelyau.diff, -5, 12) : null;
    cards.push(_testCard(
      "strelyau",
      "Психологическая гибкость (Стреляу)",
      "Тест 7 · Стреляу",
      value,
      previous?.strelyau?.diff !== null && previous?.strelyau?.diff !== undefined ? _normalizeLinear(previous.strelyau.diff, -5, 12) : null,
      current.strelyau.bandLabel ?? `${String(current.strelyau.diff ?? "—")} баллов`,
      previous?.strelyau?.bandLabel ?? null,
      null,
      false,
      null,
      null,
      current.strelyau.description
    ));
  }

  if (current.rotter) {
    const value = current.rotter.internal !== null ? _normalizeLinear(current.rotter.internal, 0, 23) : null;
    cards.push(_testCard(
      "rotter",
      "Локус контроля (Роттер)",
      "Тест 8 · Роттер",
      value,
      previous?.rotter?.internal !== null && previous?.rotter?.internal !== undefined ? _normalizeLinear(previous.rotter.internal, 0, 23) : null,
      current.rotter.orientation === null
        ? `${String(current.rotter.internal ?? "—")} / ${String(current.rotter.external ?? "—")}`
        : `Ориентация: ${_rotterOrientationLabel(current.rotter.orientation)}`,
      previous?.rotter?.orientation ? `Ориентация: ${_rotterOrientationLabel(previous.rotter.orientation)}` : null,
      null,
      false,
      _rotterSlices(current.rotter),
      null,
      null
    ));
  }

  if (current.tolerance) {
    const value = current.tolerance.tn !== null ? _normalizeLinear(current.tolerance.tn, 0, 80) : null;
    cards.push(_testCard(
      "tolerance",
      "Толерантность (Корнилов)",
      "Тест 9 · Корнилов",
      value,
      previous?.tolerance?.tn !== null && previous?.tolerance?.tn !== undefined ? _normalizeLinear(previous.tolerance.tn, 0, 80) : null,
      current.tolerance.tn !== null ? `ТН ${String(current.tolerance.tn)}` : "—",
      previous?.tolerance?.tn !== null && previous?.tolerance?.tn !== undefined ? `ТН ${String(previous.tolerance.tn)}` : null,
      null,
      false,
      null,
      _toleranceBars(current.tolerance),
      null
    ));
  }

  if (current.thomas) {
    cards.push(_testCard(
      "thomas",
      "Поведение в конфликте (Томас–Килманн)",
      "Тест 13 · Томас–Килманн",
      null,
      null,
      thomasKilmannStyleLabel(current.thomas.dominant),
      previous?.thomas ? thomasKilmannStyleLabel(previous.thomas.dominant) : null,
      null,
      false,
      _thomasSlices(current.thomas),
      null,
      null
    ));
  }

  if (current.pochebut) {
    const value = current.pochebut.level !== null ? POCHEBUT_LEVEL_PERCENT[current.pochebut.level] : null;
    cards.push(_testCard(
      "pochebut",
      "Лояльность (Почебут)",
      "Тест 15 · Почебут",
      value,
      previous?.pochebut?.level !== null && previous?.pochebut?.level !== undefined ? POCHEBUT_LEVEL_PERCENT[previous.pochebut.level] : null,
      current.pochebut.level !== null ? pochebutLevelLabel(current.pochebut.level) : `${String(current.pochebut.sum ?? "—")} баллов`,
      previous?.pochebut?.level ? pochebutLevelLabel(previous.pochebut.level) : null,
      null,
      false,
      null,
      null,
      null
    ));
  }

  if (current.kos) {
    cards.push(_testCard(
      "kos",
      "Коммуникативные и организаторские склонности (КОС)",
      "Тест 16 · КОС",
      null,
      null,
      `Комм.: ${kosLevelLabel(current.kos.commLevel)} · Орг.: ${kosLevelLabel(current.kos.orgLevel)}`,
      previous?.kos ? `Комм.: ${kosLevelLabel(previous.kos.commLevel)} · Орг.: ${kosLevelLabel(previous.kos.orgLevel)}` : null,
      null,
      false,
      null,
      _kosBars(current.kos),
      null
    ));
  }

  if (current.burnout && _burnoutHasDisplayableScores(current.burnout)) {
    const piCritical =
      current.burnout.piBand === "high" || current.burnout.piBand === "extremely_high";
    const workerLoadCritical =
      current.burnout.workerLoadBand === "high" ||
      current.burnout.workerLoadBand === "extremely_high";
    const burnoutBars = _burnoutBars(current.burnout, piCritical);
    const workerLoad = current.burnout.workerLoad;
    if (burnoutBars.length > 0) {
      cards.push(_testCard(
        "burnout",
        "Выгорание (Рукавишников)",
        "Тест 12 · Рукавишников",
        workerLoad,
        previous?.burnout?.workerLoad ?? null,
        _burnoutResultText(current.burnout),
        previous?.burnout ? _burnoutResultText(previous.burnout) : null,
        workerLoad !== null ? burnoutBandLabel("worker_load", workerLoad) : null,
        piCritical || workerLoadCritical,
        null,
        burnoutBars,
        workerLoad !== null
          ? `${RUKAVISHNIKOV_WORKER_LOAD_INDEX_SHORT} — индекс рабочей загрузки (0–100): ${RUKAVISHNIKOV_WORKER_LOAD_FORMULA_TEXT}. ИПВ — сумма ПИ+ЛО+ПМ.`
          : null
      ));
    }
  }

  return cards;
}

function _testCard(
  key: string,
  title: string,
  methodology: string,
  valuePercent: number | null,
  previousValuePercent: number | null,
  resultText: string,
  previousResultText: string | null,
  levelLabel: string | null,
  danger: boolean,
  slices: ReadonlyArray<DashboardChartSlice> | null,
  bars: ReadonlyArray<DashboardMetricBar> | null,
  summary: string | null
): DashboardTestCard {
  return {
    key,
    title,
    methodology,
    valuePercent,
    previousValuePercent,
    resultText,
    previousResultText,
    levelLabel,
    danger,
    slices,
    bars,
    summary,
  };
}

function _rotterOrientationLabel(orientation: NonNullable<RotterScores["orientation"]>): string {
  if (orientation === "external") {
    return "экстернальная";
  }
  if (orientation === "internal") {
    return "интернальная";
  }
  return "сбалансированная";
}

function _roweBars(scores: RoweStyleScores): ReadonlyArray<DashboardMetricBar> {
  return [
    { label: "Стиль 1", value: scores.styleCounts[1], color: dashboardSeriesColor(0), max: scores.pairsTotal },
    { label: "Стиль 2", value: scores.styleCounts[2], color: dashboardSeriesColor(1), max: scores.pairsTotal },
    { label: "Стиль 3", value: scores.styleCounts[3], color: dashboardSeriesColor(2), max: scores.pairsTotal },
    { label: "Стиль 4", value: scores.styleCounts[4], color: dashboardSeriesColor(3), max: scores.pairsTotal },
  ];
}

function _paperworkBars(scores: PaperworkGroupScores): ReadonlyArray<DashboardMetricBar> {
  return [
    { label: "Группа 1", value: scores.groupScores[1], color: dashboardSeriesColor(0) },
    { label: "Группа 2", value: scores.groupScores[2], color: dashboardSeriesColor(1) },
    { label: "Группа 3", value: scores.groupScores[3], color: dashboardSeriesColor(2) },
    { label: "Группа 4", value: scores.groupScores[4], color: dashboardSeriesColor(3) },
  ];
}

function _rotterSlices(scores: RotterScores): ReadonlyArray<DashboardChartSlice> {
  if (scores.internal === null || scores.external === null) {
    return [];
  }
  return [
    { name: "Интернальность", value: scores.internal, color: DASHBOARD_CHART_COLORS.brand },
    { name: "Экстернальность", value: scores.external, color: DASHBOARD_CHART_COLORS.coral },
  ];
}

function _toleranceBars(scores: ToleranceFactorScores): ReadonlyArray<DashboardMetricBar> {
  return [
    { label: "ТН", value: scores.tn ?? 0, color: DASHBOARD_CHART_COLORS.brand },
    { label: "ИТН-1", value: scores.itn1 ?? 0, color: DASHBOARD_CHART_COLORS.blue },
    { label: "МИТН", value: scores.mitn ?? 0, color: DASHBOARD_CHART_COLORS.amber },
  ];
}

function _thomasSlices(scores: ThomasKilmannScores): ReadonlyArray<DashboardChartSlice> {
  return THOMAS_STYLE_ORDER.map((style, index) => ({
    name: thomasKilmannStyleLabel(style),
    value: scores.counts[style],
    color: dashboardSeriesColor(index),
  })).filter((item) => item.value > 0);
}

function _kosBars(scores: KosScores): ReadonlyArray<DashboardMetricBar> {
  return [
    {
      label: "Комм.",
      value: scores.commK !== null ? Math.round(scores.commK * 100) : 0,
      color: DASHBOARD_CHART_COLORS.brand,
      max: 100,
    },
    {
      label: "Орг.",
      value: scores.orgK !== null ? Math.round(scores.orgK * 100) : 0,
      color: DASHBOARD_CHART_COLORS.blue,
      max: 100,
    },
  ];
}

function _burnoutResultText(scores: BurnoutScores): string {
  const headline: string[] = [];
  if (scores.workerLoad !== null) {
    headline.push(
      `${RUKAVISHNIKOV_WORKER_LOAD_INDEX_SHORT} ${String(scores.workerLoad)} · ${burnoutBandLabel("worker_load", scores.workerLoad)}`
    );
  }
  if (scores.ipv !== null) {
    headline.push(`ИПВ ${String(scores.ipv)}`);
  }
  if (headline.length > 0) {
    return headline.join(" · ");
  }
  const parts: string[] = [];
  if (scores.pi !== null) {
    parts.push(`ПИ ${String(scores.pi)}`);
  }
  if (scores.lo !== null) {
    parts.push(`ЛО ${String(scores.lo)}`);
  }
  if (scores.pm !== null) {
    parts.push(`ПМ ${String(scores.pm)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function _burnoutBars(scores: BurnoutScores, piCritical: boolean): ReadonlyArray<DashboardMetricBar> {
  const specs: ReadonlyArray<{
    label: string;
    raw: number | null;
    max: number;
    color: string;
    danger?: boolean;
  }> = [
    {
      label: "ПИ",
      raw: scores.pi,
      max: BURNOUT_PI_MAX,
      color: piCritical ? DASHBOARD_CHART_COLORS.danger : DASHBOARD_CHART_COLORS.brand,
      danger: piCritical,
    },
    { label: "ЛО", raw: scores.lo, max: BURNOUT_LO_MAX, color: DASHBOARD_CHART_COLORS.blue },
    { label: "ПМ", raw: scores.pm, max: BURNOUT_PM_MAX, color: DASHBOARD_CHART_COLORS.amber },
    { label: "ИПВ", raw: scores.ipv, max: BURNOUT_IPV_MAX, color: DASHBOARD_CHART_COLORS.coral },
    {
      label: RUKAVISHNIKOV_WORKER_LOAD_INDEX_SHORT,
      raw: scores.workerLoad,
      max: BURNOUT_WORKER_LOAD_MAX,
      color: DASHBOARD_CHART_COLORS.danger,
    },
  ];

  return specs
    .filter((item) => item.raw !== null)
    .map((item) => ({
      label: item.label,
      value:
        item.label === RUKAVISHNIKOV_WORKER_LOAD_INDEX_SHORT
          ? item.raw!
          : Math.round((item.raw! / item.max) * 100),
      rawValue: item.raw!,
      color: item.color,
      danger: item.danger,
      max: 100,
    }));
}

/**
 * Восстанавливает шкалы выгорания: сначала из ответов, затем из метрик/блока отчёта.
 */
function _resolveBurnoutScores(
  answers: AuditAnswersMap | null,
  report: AuditReportJson | null
): BurnoutScores | null {
  const fromAnswers =
    answers !== null ? computeBurnoutScores(_stepAnswers(answers, "maslach_burnout")) : null;
  if (fromAnswers !== null && _burnoutHasDisplayableScores(fromAnswers)) {
    return fromAnswers;
  }

  const fromReport = _parseBurnoutFromReport(report);
  if (fromReport !== null) {
    return _mergeBurnoutScores(fromAnswers, fromReport);
  }

  if (fromAnswers !== null && fromAnswers.answeredCount > 0) {
    return fromAnswers;
  }
  return null;
}

function _burnoutHasDisplayableScores(scores: BurnoutScores): boolean {
  return (
    scores.pi !== null ||
    scores.lo !== null ||
    scores.pm !== null ||
    scores.ipv !== null ||
    scores.workerLoad !== null
  );
}

function _finalizeBurnoutScaleSums(
  pi: number | null,
  lo: number | null,
  pm: number | null,
  partial: Omit<BurnoutScores, "pi" | "lo" | "pm" | "ipv" | "workerLoad" | "piBand" | "loBand" | "pmBand" | "ipvBand" | "workerLoadBand">
): BurnoutScores {
  const ipv = pi !== null && lo !== null && pm !== null ? pi + lo + pm : null;
  const workerLoad = computeRukavishnikovWorkerLoadFromSums(pi, lo, pm);
  return {
    ...partial,
    pi,
    lo,
    pm,
    ipv,
    workerLoad,
    piBand: pi !== null ? burnoutBand("pi", pi) : null,
    loBand: lo !== null ? burnoutBand("lo", lo) : null,
    pmBand: pm !== null ? burnoutBand("pm", pm) : null,
    ipvBand: ipv !== null ? burnoutBand("ipv", ipv) : null,
    workerLoadBand: workerLoad !== null ? burnoutBand("worker_load", workerLoad) : null,
  };
}

function _mergeBurnoutScores(
  primary: BurnoutScores | null,
  fallback: BurnoutScores
): BurnoutScores {
  const pi = primary?.pi ?? fallback.pi;
  const lo = primary?.lo ?? fallback.lo;
  const pm = primary?.pm ?? fallback.pm;

  return _finalizeBurnoutScaleSums(pi, lo, pm, {
    answeredCount: Math.max(primary?.answeredCount ?? 0, fallback.answeredCount),
    totalItems: primary?.totalItems ?? fallback.totalItems,
  });
}

/** Парсит ПИ/ЛО/ПМ/ИПВ из сохранённого отчёта. */
function _parseBurnoutFromReport(report: AuditReportJson | null): BurnoutScores | null {
  if (report === null) {
    return null;
  }

  const fromMetrics = _burnoutFromReportMetrics(report);
  const fromBlock = _burnoutFromReportTestBlock(report);
  const merged = _mergeBurnoutScores(
    fromMetrics,
    fromBlock ?? _emptyBurnoutScores()
  );

  if (!_burnoutHasDisplayableScores(merged)) {
    return null;
  }
  return merged;
}

function _emptyBurnoutScores(): BurnoutScores {
  return {
    pi: null,
    lo: null,
    pm: null,
    ipv: null,
    workerLoad: null,
    piBand: null,
    loBand: null,
    pmBand: null,
    ipvBand: null,
    workerLoadBand: null,
    answeredCount: 0,
    totalItems: 72,
  };
}

function _burnoutFromReportMetrics(report: AuditReportJson): BurnoutScores | null {
  const metrics = extractMetricsFromStoredAuditReport(report) ?? report.metrics;
  if (metrics === null || typeof metrics !== "object") {
    return null;
  }

  const pi = typeof metrics.burnout_pi_sum === "number" ? metrics.burnout_pi_sum : null;
  const lo = typeof metrics.burnout_lo_sum === "number" ? metrics.burnout_lo_sum : null;
  const pm = typeof metrics.burnout_pm_sum === "number" ? metrics.burnout_pm_sum : null;

  if (!_burnoutHasDisplayableScores(_finalizeBurnoutScaleSums(pi, lo, pm, _emptyBurnoutScores()))) {
    return null;
  }

  return _finalizeBurnoutScaleSums(pi, lo, pm, {
    ..._emptyBurnoutScores(),
    answeredCount: 72,
  });
}

function _burnoutFromReportTestBlock(report: AuditReportJson): BurnoutScores | null {
  const block = report.testBlocks.find(
    (item) =>
      item.internalKeys.includes("maslach_burnout") ||
      item.title.toLowerCase().includes("выгоран") ||
      item.title.toLowerCase().includes("рукавишник")
  );
  if (block === undefined) {
    return null;
  }

  let pi: number | null = null;
  let lo: number | null = null;
  let pm: number | null = null;
  let answeredCount = 0;

  for (const line of block.results) {
    const answeredMatch = line.match(/Ответов:\s*(\d+)\s*из\s*(\d+)/);
    if (answeredMatch !== null) {
      answeredCount = Number(answeredMatch[1]);
    }

    const piMatch = line.match(/ПИ(?:\s*\([^)]+\))?:\s*(\d+)/);
    if (piMatch !== null) {
      pi = Number(piMatch[1]);
    }
    const loMatch = line.match(/ЛО(?:\s*\([^)]+\))?:\s*(\d+)/);
    if (loMatch !== null) {
      lo = Number(loMatch[1]);
    }
    const pmMatch = line.match(/ПМ(?:\s*\([^)]+\))?:\s*(\d+)/);
    if (pmMatch !== null) {
      pm = Number(pmMatch[1]);
    }
  }

  if (report.burnoutPiAlert?.score !== null && report.burnoutPiAlert?.score !== undefined && pi === null) {
    pi = report.burnoutPiAlert.score;
  }

  const finalized = _finalizeBurnoutScaleSums(pi, lo, pm, {
    ..._emptyBurnoutScores(),
    answeredCount,
  });

  if (!_burnoutHasDisplayableScores(finalized)) {
    return null;
  }

  return finalized;
}

function _buildSectarianSection(
  current: MethodologyBundle,
  previous: MethodologyBundle | null
): DashboardSectarianSection | null {
  if (!current.sectarian?.complete) {
    return null;
  }

  return {
    resultText: current.sectarian.anyDetected
      ? `Выявлено: ${current.sectarian.hrProfileRows.filter((row) => row.detected).map((row) => row.summaryLabel).join(", ")}`
      : "Причастность к деструктивным группам не выявлена",
    previousResultText:
      previous?.sectarian?.complete
        ? previous.sectarian.anyDetected
          ? `Выявлено: ${previous.sectarian.hrProfileRows.filter((row) => row.detected).map((row) => row.summaryLabel).join(", ")}`
          : "Причастность к деструктивным группам не выявлена"
        : null,
    anyDetected: current.sectarian.anyDetected,
    bars: _sectarianBars(current.sectarian),
  };
}

function _sectarianBars(
  evaluation: SectarianismEvaluation
): ReadonlyArray<DashboardMetricBar> {
  return evaluation.hrProfileRows.map((row, index) => ({
    label: row.summaryLabel,
    value: row.scorePercent,
    color: row.detected ? DASHBOARD_CHART_COLORS.danger : dashboardSeriesColor(index),
    danger: row.detected,
    max: 100,
  }));
}

function _buildIntelligenceCard(
  cfit: CfitTotals | null,
  previousCfit: CfitTotals | null,
  report: AuditReportJson | null
): EmployeeDashboardVisual["intelligence"] {
  const fromReport = report?.conclusion.intelligence;

  if (cfit && cfit.answeredTotal > 0) {
    return {
      iq: cfit.iq,
      previousIq: previousCfit && previousCfit.answeredTotal > 0 ? previousCfit.iq : null,
      bandLabel: fromReport?.bandLabel ?? "—",
      rawScore: cfit.correctTotal,
    };
  }

  if (fromReport?.iq !== null && fromReport?.iq !== undefined) {
    return {
      iq: fromReport.iq,
      previousIq: null,
      bandLabel: fromReport.bandLabel,
      rawScore: null,
    };
  }

  return null;
}

function _buildYoYChart(report: AuditReportJson | null): EmployeeDashboardVisual["yoy"] {
  if (report === null) {
    return null;
  }

  const deltas = report.yoy?.deltas ?? [];
  const metrics = deltas.map((item) => ({
    label: item.label,
    before: item.before,
    after: item.after,
    delta: item.delta,
  }));

  return {
    metrics,
    note: report.ai.yearOverYearDynamics,
    hasPrevious: Boolean(report.yoy?.previousSessionId),
  };
}

/** Краткая подпись значения для тултипа сектантства. */
export function formatDashboardSectarianPercent(value: number): string {
  return `${formatSectarianismPercent(value)}%`;
}
