"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { DASHBOARD_CHART_COLORS } from "@/lib/admin/employeeDashboardTheme";
import type { SpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import {
  SPECIALIST_SCREENING_SCALES_HINT,
  buildSpecialistScaleDetails,
  specialistScaleBadgeClass,
} from "@/lib/specialistScreening/specialistScreeningScaleDetails";

type SpecialistScreeningScalesSectionProps = {
  interpretation: SpecialistScreeningInterpretation;
};

/**
 * Блок шкал скрининга: столбчатая диаграмма и карточки интерпретации.
 */
export function SpecialistScreeningScalesSection({
  interpretation,
}: SpecialistScreeningScalesSectionProps): React.ReactElement {
  const details = buildSpecialistScaleDetails([
    interpretation.phq9,
    interpretation.gad7,
    interpretation.asrs,
  ]);

  const chartData = details.map((item) => ({
    name: item.shortTitle,
    fullLabel: item.title,
    percent: item.percent,
    score: item.score,
    maxScore: item.maxScore,
    levelLabel: item.levelLabel,
    fill: item.unfavorable ? DASHBOARD_CHART_COLORS.amber : DASHBOARD_CHART_COLORS.brand,
  }));

  return (
    <section className={`px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
      <h3 className={adminPanelSectionTitleClass}>Результаты по шкалам</h3>
      <p className={`mt-1 mb-4 ${adminPanelMutedTextClass}`}>
        {SPECIALIST_SCREENING_SCALES_HINT}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="flex min-h-[320px] w-full flex-col rounded-2xl border border-black/8 bg-white/75 px-3 pb-5 pt-4">
          <div className="min-h-0 w-full flex-1" style={{ height: 248 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  stroke={DASHBOARD_CHART_COLORS.grid}
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: DASHBOARD_CHART_COLORS.textMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => `${String(value)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={64}
                  tick={{ fill: DASHBOARD_CHART_COLORS.text, fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ScaleTooltip />} />
                <Bar dataKey="percent" radius={[0, 8, 8, 0]} maxBarSize={28} isAnimationActive>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-center text-[11px] font-semibold text-[#8C8C8C]">
            Доля от максимума шкалы · янтарный — выше порога внимания
          </p>
        </div>

        <ul className="space-y-3">
          {details.map((item) => (
            <li
              key={item.key}
              className="rounded-2xl border border-black/8 bg-white/75 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-extrabold text-[#5F5E5E]">{item.title}</p>
                <span
                  className={`text-[18px] font-extrabold tabular-nums ${
                    item.unfavorable ? "text-red-700" : "text-[#007A68]"
                  }`}
                >
                  {`${String(item.score)} / ${String(item.maxScore)}`}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold ${specialistScaleBadgeClass(item.unfavorable)}`}
                >
                  {item.levelLabel}
                </span>
              </div>
              <p className={`mt-1.5 text-[12px] leading-snug ${adminPanelMutedTextClass}`}>
                {item.meaning}
              </p>
              <p className="mt-2 text-[13px] font-medium leading-snug text-[#5F5E5E]">
                {item.levelText}
              </p>
              <p className={`mt-1.5 text-[11px] ${adminPanelMutedTextClass}`}>{item.note}</p>
            </li>
          ))}
        </ul>
      </div>

      {interpretation.phq9Item9Positive ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
          Вопрос 9 PHQ-9: ответ отличается от «Никогда» — требуется немедленное
          конфиденциальное действие в тот же день.
        </p>
      ) : null}
    </section>
  );
}

function ScaleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: {
      fullLabel?: string;
      score?: number;
      maxScore?: number;
      levelLabel?: string;
      percent?: number;
    };
  }>;
}): React.ReactElement | null {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }
  const row = payload[0].payload;
  return (
    <div className="rounded-xl bg-[#5F5E5E] px-3 py-2 text-[12px] text-white shadow-lg">
      <p className="font-bold">{row.fullLabel ?? "Шкала"}</p>
      <p className="mt-0.5">
        {String(row.score ?? 0)} / {String(row.maxScore ?? 0)}
        {row.levelLabel ? ` · ${row.levelLabel}` : ""}
      </p>
      <p className="mt-0.5 opacity-90">{String(row.percent ?? 0)}% от максимума</p>
    </div>
  );
}
