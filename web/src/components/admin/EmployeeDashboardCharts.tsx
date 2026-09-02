"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import { formatDashboardSectarianPercent } from "@/lib/admin/buildEmployeeDashboardVisual";
import {
  DASHBOARD_CHART_COLORS,
  dashboardLevelColor,
} from "@/lib/admin/employeeDashboardTheme";
import type {
  DashboardAlertItem,
  DashboardChartSlice,
  DashboardGauge,
  DashboardKpiCard,
  DashboardMetricBar,
  DashboardScaleMetric,
  DashboardSectarianSection,
  DashboardTestCard,
  DashboardYoYMetric,
  EmployeeDashboardVisual,
} from "@/lib/admin/employeeDashboardTypes";

type EmployeeDashboardChartsProps = {
  visual: EmployeeDashboardVisual;
  loading?: boolean;
};

const SECTARIANISM_DETECTION_THRESHOLD_PERCENT = 70;

/**
 * Визуальный дашборд сотрудника: KPI, радар-профиль (текущий vs прошлый период),
 * кольцевые датчики, модульные карточки по всем методикам батареи и таблицы
 * сильных зон / зон для развития с динамикой год к году.
 */
export function EmployeeDashboardCharts({
  visual,
  loading = false,
}: EmployeeDashboardChartsProps): React.ReactElement {
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!visual.hasData) {
    return (
      <p className={adminPanelMutedTextClass}>
        Данные тестирования ещё не сформированы. Дашборд появится после прохождения скрининга.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {visual.sessionLabel ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="font-semibold text-[#8C8C8C]">Источник данных:</span>
          <span className="font-bold text-[#5F5E5E]">{visual.sessionLabel}</span>
          {visual.previousSessionLabel ? (
            <span className="rounded-full bg-[#FDE8E8] px-2 py-0.5 text-[11px] font-bold text-[#C71F1F]">
              сравнение с: {visual.previousSessionLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {visual.kpiCards.length > 0 ? <KpiCardsRow cards={visual.kpiCards} /> : null}

      <DashboardAlertsRow alerts={visual.criticalAlerts} />

      <div className="grid gap-4 xl:grid-cols-12">
        <DashboardCard
          title="Мотивация (Герчиков)"
          subtitle={
            visual.radar
              ? visual.hasPrevious
                ? "Синий — текущий период, красный — прошлый"
                : "Пять типов трудовой мотивации"
              : "Данные теста пока не найдены"
          }
          className="xl:col-span-6"
        >
          {visual.radar ? (
            <ProfileRadar radar={visual.radar} />
          ) : (
            <p className={adminPanelMutedTextClass}>
              Радар появится после прохождения теста Герчикова (шаг 21 батареи) или при наличии
              ответов в отчёте скрининга.
            </p>
          )}
        </DashboardCard>

        {visual.gauges.length > 0 ? (
          <DashboardCard title="Средние уровни по шкалам" className="xl:col-span-6">
            <GaugeGrid gauges={visual.gauges} />
          </DashboardCard>
        ) : null}
      </div>

      {visual.profileMetrics.length > 0 ? (
        <div>
          <h4 className="mb-3 text-[14px] font-extrabold text-[#5F5E5E]">Профиль сотрудника</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visual.profileMetrics.map((metric) => (
              <ProfileMetricCard key={metric.key} metric={metric} hasPrevious={visual.hasPrevious} />
            ))}
          </div>
        </div>
      ) : null}

      {visual.intelligence ? (
        <DashboardCard title="Интеллект (Кэттелл, CFIT)">
          <IntelligenceStat
            iq={visual.intelligence.iq}
            previousIq={visual.intelligence.previousIq}
            bandLabel={visual.intelligence.bandLabel}
            rawScore={visual.intelligence.rawScore}
          />
        </DashboardCard>
      ) : null}

      {visual.testCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visual.testCards.map((card) => (
            <TestCardView key={card.key} card={card} hasPrevious={visual.hasPrevious} />
          ))}
        </div>
      ) : null}

      {visual.sectarianSection ? (
        <DashboardCard
          title="Сектантство"
          subtitle="Тест 18 · скрининг деструктивных групп"
          className={visual.sectarianSection.anyDetected ? "ring-[#C71F1F]/20" : undefined}
        >
          <SectarianSectionView section={visual.sectarianSection} hasPrevious={visual.hasPrevious} />
        </DashboardCard>
      ) : null}

      {(visual.strengths.length > 0 || visual.growthZones.length > 0) ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visual.strengths.length > 0 ? (
            <DashboardCard title="ТОП-5 сильных зон">
              <ZoneTable metrics={visual.strengths} tone="positive" hasPrevious={visual.hasPrevious} />
            </DashboardCard>
          ) : null}
          {visual.growthZones.length > 0 ? (
            <DashboardCard title="ТОП-5 зон для развития">
              <ZoneTable metrics={visual.growthZones} tone="growth" hasPrevious={visual.hasPrevious} />
            </DashboardCard>
          ) : null}
        </div>
      ) : null}

      {visual.yoy && (visual.yoy.hasPrevious || visual.yoy.metrics.length > 0) ? (
        <DashboardCard
          title="Динамика год к году"
          subtitle={visual.yoy.hasPrevious ? "Сравнение с предыдущим прохождением" : undefined}
        >
          {visual.yoy.metrics.length > 0 ? (
            <YoYBarChart metrics={visual.yoy.metrics} />
          ) : (
            <p className={adminPanelMutedTextClass}>
              {visual.yoy.note ?? "Динамика год к году появится при повторных прохождениях."}
            </p>
          )}
          {visual.yoy.note && visual.yoy.metrics.length > 0 ? (
            <p className={`mt-3 ${adminPanelMutedTextClass}`}>{visual.yoy.note}</p>
          ) : null}
        </DashboardCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardTextCard title="Краткое описание профиля" text={visual.profileSummary} />
        <DashboardTextCard title="Применимая мотивация" text={visual.motivationSummary} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Скелетон загрузки
// ---------------------------------------------------------------------------

function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={`kpi-${String(index)}`} className="h-[112px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <SkeletonBlock key={`alert-${String(index)}`} className="h-[72px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <SkeletonBlock className="h-[320px] rounded-2xl xl:col-span-6" />
        <SkeletonBlock className="h-[320px] rounded-2xl xl:col-span-6" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonBlock key={`profile-${String(index)}`} className="h-[100px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={`test-${String(index)}`} className="h-[240px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <SkeletonBlock key={`zone-${String(index)}`} className="h-[220px] rounded-2xl" />
        ))}
      </div>
      <style>{`
        @keyframes dashboard-skeleton-pulse {
          0% { opacity: 0.55; }
          50% { opacity: 0.9; }
          100% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }): React.ReactElement {
  return (
    <div
      className={`bg-[#E8EFEC] ${className}`}
      style={{ animation: "dashboard-skeleton-pulse 1.4s ease-in-out infinite" }}
    />
  );
}

// ---------------------------------------------------------------------------
// KPI-карточки
// ---------------------------------------------------------------------------

const ACCENT_HEX: Readonly<Record<DashboardKpiCard["accent"], string>> = {
  brand: DASHBOARD_CHART_COLORS.brand,
  blue: DASHBOARD_CHART_COLORS.blue,
  amber: DASHBOARD_CHART_COLORS.amber,
  coral: DASHBOARD_CHART_COLORS.coral,
  danger: DASHBOARD_CHART_COLORS.danger,
};

function KpiCardsRow({ cards }: { cards: ReadonlyArray<DashboardKpiCard> }): React.ReactElement {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl bg-white/85 px-4 py-4 ring-1 ring-black/6"
          style={{ borderTop: `3px solid ${ACCENT_HEX[card.accent]}` }}
        >
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#8C8C8C]">
            {card.label}
          </p>
          <p
            className="mt-2 text-[22px] font-extrabold leading-tight"
            style={{ color: ACCENT_HEX[card.accent] }}
          >
            {card.valueText}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[12px] text-[#8C8C8C]">{card.sublabel}</p>
            {card.deltaPercent !== null ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  card.deltaGood === false
                    ? "bg-[#FDE8E8] text-[#C71F1F]"
                    : "bg-[#00B596]/12 text-[#007A68]"
                }`}
              >
                {card.deltaPercent > 0 ? "+" : ""}
                {String(card.deltaPercent)}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Алерты
// ---------------------------------------------------------------------------

function DashboardAlertsRow({
  alerts,
}: {
  alerts: ReadonlyArray<DashboardAlertItem>;
}): React.ReactElement | null {
  if (alerts.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((alert) => (
        <div
          key={`${alert.title}-${alert.detail}`}
          className={`rounded-2xl px-4 py-3 ${
            alert.severity === "danger"
              ? "bg-[#FDE8E8] ring-1 ring-[#C71F1F]/25"
              : alert.severity === "warning"
                ? "bg-[#FEF3C7] ring-1 ring-[#E9A319]/30"
                : "bg-white/75 ring-1 ring-[#00B596]/20"
          }`}
        >
          <p
            className={`text-[14px] font-extrabold ${
              alert.severity === "danger"
                ? "text-[#C71F1F]"
                : alert.severity === "warning"
                  ? "text-[#B45309]"
                  : "text-[#007A68]"
            }`}
          >
            {alert.title}
          </p>
          <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>{alert.detail}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Карточки-обёртки
// ---------------------------------------------------------------------------

function DashboardCard({
  title,
  subtitle,
  accent = "default",
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: "default" | "danger";
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={`rounded-2xl bg-white/80 px-4 py-4 ring-1 ${
        accent === "danger" ? "ring-[#C71F1F]/20" : "ring-black/6"
      } ${className ?? ""}`}
    >
      <h4 className="text-[14px] font-extrabold text-[#5F5E5E]">{title}</h4>
      {subtitle ? <p className="mt-1 text-[12px] font-semibold text-[#8C8C8C]">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DashboardTextCard({ title, text }: { title: string; text: string }): React.ReactElement {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-black/6">
      <h4 className="text-[14px] font-extrabold text-[#8C8C8C]">{title}</h4>
      <p className={`mt-2 whitespace-pre-wrap ${adminPanelMutedTextClass}`}>{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Радар-профиль (текущий vs прошлый период)
// ---------------------------------------------------------------------------

function ProfileRadar({
  radar,
}: {
  radar: NonNullable<EmployeeDashboardVisual["radar"]>;
}): React.ReactElement {
  const data = radar.axes.map((axis, index) => {
    const entry: Record<string, number | string> = { axis };
    for (const series of radar.series) {
      entry[series.key] = series.values[index]?.value ?? 0;
    }
    return entry;
  });

  return (
    <div className="space-y-3">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke={DASHBOARD_CHART_COLORS.grid} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: DASHBOARD_CHART_COLORS.text, fontSize: 11, fontWeight: 600 }}
            />
            {radar.series.map((series) => (
              <Radar
                key={series.key}
                name={series.label}
                dataKey={series.key}
                stroke={series.color}
                fill={series.color}
                fillOpacity={series.key === "current" ? 0.32 : 0.12}
                strokeWidth={2}
                strokeDasharray={series.key === "previous" ? "5 4" : undefined}
                isAnimationActive
              />
            ))}
            <Tooltip contentStyle={_tooltipStyle} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => (
                <span className="text-[12px] font-medium text-[#5F5E5E]">{String(value)}</span>
              )}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {radar.series.length > 1 ? (
        <p className="text-[11px] font-semibold text-[#8C8C8C]">
          Сплошная заливка — текущий период, пунктир — предыдущий.
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Кольцевые датчики
// ---------------------------------------------------------------------------

function GaugeGrid({ gauges }: { gauges: ReadonlyArray<DashboardGauge> }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 [grid-template-columns:repeat(2,minmax(0,1fr))]">
      {gauges.map((gauge) => (
        <GaugeRing key={gauge.label} gauge={gauge} />
      ))}
    </div>
  );
}

function _splitGaugeLabel(label: string): { title: string; suffix: string | null } {
  const match = label.match(/^(.+?)\s*(\([^)]+\))\s*$/);
  if (match === null) {
    return { title: label, suffix: null };
  }
  return { title: match[1]!.trim(), suffix: match[2]!.trim() };
}

function GaugeRing({ gauge }: { gauge: DashboardGauge }): React.ReactElement {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dash = (gauge.percent / 100) * circumference;
  const { title, suffix } = _splitGaugeLabel(gauge.label);

  return (
    <div className="flex h-full min-w-0 flex-col items-center overflow-hidden rounded-xl bg-white/70 px-2 py-3 text-center ring-1 ring-black/4">
      <svg width="54" height="54" viewBox="0 0 64 64" className="shrink-0" aria-hidden>
        <circle cx="32" cy="32" r={radius} fill="none" stroke={DASHBOARD_CHART_COLORS.grid} strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={gauge.color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${String(dash)} ${String(circumference)}`}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill={DASHBOARD_CHART_COLORS.text}>
          {String(gauge.percent)}
        </text>
      </svg>
      <div className="mt-2 w-full min-w-0 px-0.5">
        <p className="text-[11px] font-bold leading-snug text-[#5F5E5E] [overflow-wrap:anywhere]">
          {title}
        </p>
        {suffix !== null ? (
          <p className="mt-0.5 text-[10px] font-semibold leading-snug text-[#8C8C8C]">{suffix}</p>
        ) : null}
        <p className="mt-1 text-[10px] leading-snug text-[#8C8C8C] [overflow-wrap:anywhere]">
          {gauge.caption}
        </p>
        {gauge.deltaPercent !== null ? (
          <span
            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
              gauge.deltaPercent < 0
                ? "bg-[#FDE8E8] text-[#C71F1F]"
                : "bg-[#00B596]/12 text-[#007A68]"
            }`}
          >
            {gauge.deltaPercent > 0 ? "+" : ""}
            {String(gauge.deltaPercent)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Карточки метрик профиля (бывшие оси радара)
// ---------------------------------------------------------------------------

function ProfileMetricCard({
  metric,
  hasPrevious,
}: {
  metric: DashboardScaleMetric;
  hasPrevious: boolean;
}): React.ReactElement {
  const higherIsBetter = metric.higherIsBetter !== false;
  const color = dashboardLevelColor(higherIsBetter ? metric.value : 100 - metric.value);
  const deltaGood =
    metric.delta === null ? null : higherIsBetter ? metric.delta >= 0 : metric.delta <= 0;
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-black/6">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold leading-snug text-[#5F5E5E]">{metric.label}</p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
          style={{ background: color }}
        >
          {String(metric.value)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-[#8C8C8C]">
        {metric.rawText} · {metric.levelLabel}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${String(metric.value)}%`, background: color }}
        />
      </div>
      {hasPrevious && metric.previousValue !== null ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-[#8C8C8C]">
            Прошлый: {String(metric.previousValue)}
            {metric.previousRawText ? ` (${metric.previousRawText})` : ""}
          </span>
          {metric.delta !== null ? (
            <span
              className={`font-bold ${
                deltaGood === null
                  ? "text-[#8C8C8C]"
                  : deltaGood
                    ? "text-[#007A68]"
                    : "text-[#C71F1F]"
              }`}
            >
              {metric.delta > 0 ? "▲ +" : metric.delta < 0 ? "▼ " : "■ "}
              {String(metric.delta)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Сектантство
// ---------------------------------------------------------------------------

function SectarianSectionView({
  section,
  hasPrevious,
}: {
  section: DashboardSectarianSection;
  hasPrevious: boolean;
}): React.ReactElement {
  return (
    <div>
      <div
        className={`rounded-xl px-4 py-3 ${
          section.anyDetected ? "bg-[#FDE8E8] ring-1 ring-[#C71F1F]/20" : "bg-[#F4F6F5] ring-1 ring-black/6"
        }`}
      >
        <p
          className={`text-[14px] font-bold ${
            section.anyDetected ? "text-[#C71F1F]" : "text-[#007A68]"
          }`}
        >
          {section.resultText}
        </p>
        {hasPrevious && section.previousResultText ? (
          <p className="mt-1 text-[12px] font-semibold text-[#8C8C8C]">
            Прошлый период: {section.previousResultText}
          </p>
        ) : null}
      </div>
      <div className="mt-4">
        <SectarianBarChart bars={section.bars} threshold={SECTARIANISM_DETECTION_THRESHOLD_PERCENT} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Карточка IQ
// ---------------------------------------------------------------------------

function IntelligenceStat({
  iq,
  previousIq,
  bandLabel,
  rawScore,
}: {
  iq: number | null;
  previousIq: number | null;
  bandLabel: string;
  rawScore: number | null;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-6 py-2">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[#00B596]/12 ring-4 ring-[#00B596]/25">
        <div className="text-center">
          <p className="text-[32px] font-extrabold leading-none text-[#007A68]">
            {iq !== null ? String(iq) : "—"}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#8C8C8C]">IQ</p>
        </div>
      </div>
      <div>
        <p className="text-[15px] font-bold text-[#5F5E5E]">Уровень: {bandLabel}</p>
        {rawScore !== null ? (
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>Сырой балл CFIT: {String(rawScore)}</p>
        ) : null}
        <p className="mt-2 text-[13px] text-[#8C8C8C]">Норма «хороший»: 85–115</p>
        {previousIq !== null ? (
          <p className="mt-1 text-[13px] font-semibold text-[#C71F1F]">
            Прошлый период: IQ {String(previousIq)}
            {iq !== null ? ` (Δ ${iq - previousIq > 0 ? "+" : ""}${String(iq - previousIq)})` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Модульная карточка теста
// ---------------------------------------------------------------------------

function TestCardView({
  card,
  hasPrevious,
}: {
  card: DashboardTestCard;
  hasPrevious: boolean;
}): React.ReactElement {
  const hasChart = (card.slices && card.slices.length > 0) || (card.bars && card.bars.length > 0);
  return (
    <div
      className={`flex flex-col rounded-2xl bg-white/80 px-4 py-4 ring-1 ${
        card.danger ? "ring-[#C71F1F]/25" : "ring-black/6"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[14px] font-extrabold text-[#5F5E5E]">{card.title}</h4>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C]">
            {card.methodology}
          </p>
        </div>
        {card.valuePercent !== null ? (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
            style={{ background: dashboardLevelColor(card.valuePercent) }}
          >
            {String(card.valuePercent)}%
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <p className="text-[13px] font-bold text-[#5F5E5E]">{card.resultText}</p>
        {card.levelLabel ? (
          <p className="text-[11px] text-[#8C8C8C]">Уровень: {card.levelLabel}</p>
        ) : null}
        {hasPrevious && card.previousResultText ? (
          <p className="mt-1 text-[12px] font-semibold text-[#C71F1F]">
            Прошлый период: {card.previousResultText}
          </p>
        ) : null}
        {card.valuePercent !== null && card.previousValuePercent !== null ? (
          <YoYInlineDelta current={card.valuePercent} previous={card.previousValuePercent} />
        ) : null}
      </div>

      {card.summary ? (
        <p className={`mt-3 text-[12px] ${adminPanelMutedTextClass}`}>{card.summary}</p>
      ) : null}

      {hasChart ? (
        <div className="mt-3">
          {card.slices && card.slices.length > 0 ? (
            <DonutChart slices={card.slices} centerLabel="Итого" />
          ) : null}
          {card.bars && card.bars.length > 0 ? (
            <MetricBarChart bars={card.bars} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function YoYInlineDelta({ current, previous }: { current: number; previous: number }): React.ReactElement {
  const delta = current - previous;
  const good = delta >= 0;
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
        good ? "bg-[#00B596]/12 text-[#007A68]" : "bg-[#FDE8E8] text-[#C71F1F]"
      }`}
    >
      Δ {delta > 0 ? "+" : ""}
      {String(delta)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Таблицы сильных зон / зон для развития
// ---------------------------------------------------------------------------

function ZoneTable({
  metrics,
  tone,
  hasPrevious,
}: {
  metrics: ReadonlyArray<DashboardScaleMetric>;
  tone: "positive" | "growth";
  hasPrevious: boolean;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-black/6">
      <table className="w-full text-[12px]">
        <thead className="bg-[#F4F6F5] text-[11px] uppercase tracking-wide text-[#8C8C8C]">
          <tr>
            <th className="px-3 py-2 text-left font-bold">Показатель</th>
            <th className="px-2 py-2 text-right font-bold">Тек.</th>
            {hasPrevious ? <th className="px-2 py-2 text-right font-bold">Прошл.</th> : null}
            <th className="px-2 py-2 text-right font-bold">Дин.</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const delta = metric.delta;
            const good = delta === null ? null : tone === "positive" ? delta >= 0 : delta <= 0;
            return (
              <tr key={metric.key} className="border-t border-black/5">
                <td className="px-3 py-2 text-[#5F5E5E]">
                  <p className="font-bold">{metric.label}</p>
                  <p className="text-[11px] text-[#8C8C8C]">{metric.rawText}</p>
                </td>
                <td className="px-2 py-2 text-right font-bold text-[#5F5E5E]">{String(metric.value)}</td>
                {hasPrevious ? (
                  <td className="px-2 py-2 text-right font-semibold text-[#8C8C8C]">
                    {metric.previousValue !== null ? String(metric.previousValue) : "—"}
                  </td>
                ) : null}
                <td className="px-2 py-2 text-right">
                  {delta === null ? (
                    <span className="text-[#8C8C8C]">—</span>
                  ) : (
                    <span
                      className={`font-bold ${
                        good === null
                          ? "text-[#8C8C8C]"
                          : good
                            ? "text-[#007A68]"
                            : "text-[#C71F1F]"
                      }`}
                    >
                      {delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "■ "}
                      {String(delta)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Графики
// ---------------------------------------------------------------------------

function DonutChart({
  slices,
  centerLabel,
}: {
  slices: ReadonlyArray<DashboardChartSlice>;
  centerLabel: string;
}): React.ReactElement {
  const total = slices.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[...slices]}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={76}
            paddingAngle={2}
            stroke="none"
            isAnimationActive
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip total={total} />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => (
              <span className="text-[11px] font-medium text-[#5F5E5E]">{String(value)}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[78px] text-center">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8C8C8C]">{centerLabel}</p>
        <p className="text-[16px] font-extrabold text-[#5F5E5E]">{String(total)}</p>
      </div>
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number }>;
  total: number;
}): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const item = payload[0];
  const value = item.value ?? 0;
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl bg-[#5F5E5E] px-3 py-2 text-[12px] text-white shadow-lg">
      <p className="font-bold">{item.name}</p>
      <p>
        {String(value)} ({String(percent)}%)
      </p>
    </div>
  );
}

function MetricBarChart({ bars }: { bars: ReadonlyArray<DashboardMetricBar> }): React.ReactElement {
  const data = bars.map((bar) => ({
    label: bar.label,
    value: bar.value,
    fill: bar.color,
    rawValue: bar.rawValue,
  }));
  const yMax = bars.every((bar) => bar.max !== undefined)
    ? Math.max(...bars.map((bar) => bar.max ?? 100), 1)
    : Math.max(...bars.map((bar) => bar.value), 1);
  const hasValues = bars.some((bar) => bar.value > 0);

  if (!hasValues) {
    return (
      <p className={`text-[12px] ${adminPanelMutedTextClass}`}>
        Нет данных для построения диаграммы.
      </p>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={DASHBOARD_CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: DASHBOARD_CHART_COLORS.textMuted, fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fill: DASHBOARD_CHART_COLORS.textMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              bars.every((bar) => bar.max === 100) ? `${String(value)}%` : String(value)
            }
          />
          <Tooltip cursor={{ fill: "rgba(0,181,150,0.08)" }} content={<MetricBarTooltip />} />
          <Bar
            dataKey="value"
            fill={DASHBOARD_CHART_COLORS.brand}
            radius={[8, 8, 0, 0]}
            maxBarSize={44}
            minPointSize={4}
            isAnimationActive
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { label?: string; value?: number; rawValue?: number } }>;
}): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }
  const rawValue = item.rawValue;
  return (
    <div className="rounded-xl bg-[#5F5E5E] px-3 py-2 text-[12px] text-white shadow-lg">
      <p className="font-bold">{item.label}</p>
      <p>
        {rawValue !== undefined ? `${String(rawValue)} баллов` : `${String(item.value ?? 0)}`}
      </p>
    </div>
  );
}

function SectarianBarChart({
  bars,
  threshold,
}: {
  bars: ReadonlyArray<DashboardMetricBar>;
  threshold: number;
}): React.ReactElement {
  const data = bars.map((bar) => ({ label: bar.label, value: bar.value, fill: bar.color }));

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={DASHBOARD_CHART_COLORS.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: DASHBOARD_CHART_COLORS.textMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${String(v)}%`}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={118}
            tick={{ fill: DASHBOARD_CHART_COLORS.text, fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => formatDashboardSectarianPercent(value)}
            contentStyle={_tooltipStyle}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={16} isAnimationActive>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[10px] font-semibold text-[#8C8C8C]">
        Красным — совпадение ≥ {String(threshold)}%
      </p>
    </div>
  );
}

function YoYBarChart({ metrics }: { metrics: ReadonlyArray<DashboardYoYMetric> }): React.ReactElement {
  const data = metrics.map((item) => ({
    label: _shortYoYLabel(item.label),
    before: item.before ?? 0,
    after: item.after,
    delta: item.delta,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={DASHBOARD_CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: DASHBOARD_CHART_COLORS.textMuted, fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={{ fill: DASHBOARD_CHART_COLORS.textMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<YoYTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-[12px] font-medium text-[#5F5E5E]">{String(value)}</span>
            )}
          />
          <Bar dataKey="before" name="Прошлый период" fill={DASHBOARD_CHART_COLORS.previous} radius={[6, 6, 0, 0]} maxBarSize={26} isAnimationActive />
          <Bar dataKey="after" name="Текущий период" fill={DASHBOARD_CHART_COLORS.current} radius={[6, 6, 0, 0]} maxBarSize={26} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function YoYTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string; value?: number; payload?: { delta?: number | null } }>;
  label?: string;
}): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const delta = payload[0]?.payload?.delta;
  const deltaText =
    delta === null || delta === undefined ? "" : `Δ ${delta > 0 ? "+" : ""}${String(delta)}`;
  return (
    <div className="rounded-xl bg-[#5F5E5E] px-3 py-2 text-[12px] text-white shadow-lg">
      <p className="font-bold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey}>
          {entry.dataKey === "before" ? "Прошлый период" : "Текущий период"}: {String(entry.value)}
        </p>
      ))}
      {deltaText ? <p className="text-[#B8F0E6]">{deltaText}</p> : null}
    </div>
  );
}

const _tooltipStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "none",
  background: "#5F5E5E",
  color: "#fff",
  fontSize: 12,
};

function _shortYoYLabel(label: string): string {
  return label
    .replace("Выгорание (Рукавишников) — ", "Выг. ")
    .replace("CFIT — число ответов (все субтесты)", "CFIT")
    .replace("Роу — закрыто пар 1–40", "Роу");
}


