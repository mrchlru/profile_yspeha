export type DashboardAlertSeverity = "danger" | "warning" | "info";

export type DashboardAlertItem = {
  title: string;
  detail: string;
  severity: DashboardAlertSeverity;
};

export type DashboardChartSlice = {
  name: string;
  value: number;
  color: string;
};

export type DashboardMetricBar = {
  label: string;
  value: number;
  color: string;
  danger?: boolean;
  max?: number;
  /** Исходное значение для подсказки, если `value` нормализован. */
  rawValue?: number;
};

/** Нормализованная шкала (0..100) для радара, датчиков и таблиц. */
export type DashboardScaleMetric = {
  key: string;
  label: string;
  /** Нормализованное значение текущего периода 0..100. */
  value: number;
  /** Нормализованное значение предыдущего периода 0..100 (если есть). */
  previousValue: number | null;
  /** Текстовое представление сырого значения текущего периода. */
  rawText: string;
  /** Текстовое представление сырого значения предыдущего периода. */
  previousRawText: string | null;
  levelLabel: string;
  /** Положительна ли динамика (выше — лучше). */
  delta: number | null;
  /** false — высокое значение хуже (например, истощение ПИ). */
  higherIsBetter?: boolean;
};

/** Карточка ключевого показателя в верхнем ряду дашборда. */
export type DashboardKpiCard = {
  label: string;
  valueText: string;
  sublabel: string;
  deltaPercent: number | null;
  deltaGood: boolean | null;
  accent: "brand" | "blue" | "amber" | "coral" | "danger";
};

/** Кольцевой датчик среднего уровня по шкале. */
export type DashboardGauge = {
  label: string;
  percent: number;
  color: string;
  caption: string;
  deltaPercent: number | null;
};

/** Серия диаграммы-паутины: текущий vs предыдущий период. */
export type DashboardRadarSeries = {
  key: string;
  label: string;
  color: string;
  values: ReadonlyArray<{ axis: string; value: number }>;
};

/** Описатель одного теста батареи с нормализованным значением. */
export type DashboardTestCard = {
  key: string;
  title: string;
  methodology: string;
  /** Нормализованное значение 0..100 (если применимо), иначе null. */
  valuePercent: number | null;
  previousValuePercent: number | null;
  /** Главный текстовый результат. */
  resultText: string;
  previousResultText: string | null;
  levelLabel: string | null;
  danger: boolean;
  /** Детальные срезы для диаграммы (круговой/столбчатой), если есть. */
  slices: ReadonlyArray<DashboardChartSlice> | null;
  bars: ReadonlyArray<DashboardMetricBar> | null;
  /** Короткая интерпретационная выжимка. */
  summary: string | null;
};

export type DashboardYoYMetric = {
  label: string;
  before: number | null;
  after: number;
  delta: number | null;
};

/** Блок результатов теста на сектантство (только при полном прохождении). */
export type DashboardSectarianSection = {
  resultText: string;
  previousResultText: string | null;
  anyDetected: boolean;
  bars: ReadonlyArray<DashboardMetricBar>;
};

export type EmployeeDashboardVisual = {
  sessionId: string | null;
  sessionLabel: string | null;
  previousSessionLabel: string | null;
  hasData: boolean;
  hasPrevious: boolean;
  criticalAlerts: ReadonlyArray<DashboardAlertItem>;
  kpiCards: ReadonlyArray<DashboardKpiCard>;
  radar: {
    axes: ReadonlyArray<string>;
    series: ReadonlyArray<DashboardRadarSeries>;
  } | null;
  gauges: ReadonlyArray<DashboardGauge>;
  /** Метрики профиля (бывшие оси радара) — отдельные карточки ниже. */
  profileMetrics: ReadonlyArray<DashboardScaleMetric>;
  testCards: ReadonlyArray<DashboardTestCard>;
  strengths: ReadonlyArray<DashboardScaleMetric>;
  growthZones: ReadonlyArray<DashboardScaleMetric>;
  intelligence: {
    iq: number | null;
    previousIq: number | null;
    bandLabel: string;
    rawScore: number | null;
  } | null;
  yoy: {
    metrics: ReadonlyArray<DashboardYoYMetric>;
    note: string | null;
    hasPrevious: boolean;
  } | null;
  profileSummary: string;
  motivationSummary: string;
  /** Раздел сектантства — только если тест пройден полностью. */
  sectarianSection: DashboardSectarianSection | null;
};
