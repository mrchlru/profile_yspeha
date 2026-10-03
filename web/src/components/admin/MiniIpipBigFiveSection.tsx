"use client";

import React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { DASHBOARD_CHART_COLORS } from "@/lib/admin/employeeDashboardTheme";
import {
  scoreBandBadgeClass,
  scoreBandLabel,
} from "@/lib/attestation/attestationLabels";
import type { MiniIpipScores } from "@/lib/attestation/computeAttestationScores";
import {
  MINI_IPIP_BAND_HINT,
  buildMiniIpipInterpretations,
} from "@/lib/attestation/miniIpipInterpretation";

type MiniIpipBigFiveSectionProps = {
  scores: MiniIpipScores;
};

const AXIS_SHORT: Record<string, string> = {
  Extraversion: "Экстраверсия",
  Agreeableness: "Доброжел.",
  Conscientiousness: "Добросов.",
  Neuroticism: "Нейротизм",
  Openness: "Открытость",
};

/**
 * Блок Big Five: радар-профиль и интерпретация уровней.
 */
export function MiniIpipBigFiveSection({
  scores,
}: MiniIpipBigFiveSectionProps): React.ReactElement {
  const interpretations = buildMiniIpipInterpretations(scores);
  const chartData = interpretations.map((item) => ({
    axis: AXIS_SHORT[item.factor] ?? item.label,
    fullLabel: item.label,
    value: item.score,
    band: scoreBandLabel(item.band),
  }));

  return (
    <section className={`px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
      <h3 className={adminPanelSectionTitleClass}>Личностный профиль (Big Five)</h3>
      <p className={`mt-1 mb-4 ${adminPanelMutedTextClass}`}>{MINI_IPIP_BAND_HINT}</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="h-[300px] w-full rounded-2xl border border-black/8 bg-white/75 px-2 py-3">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius="70%">
              <PolarGrid stroke={DASHBOARD_CHART_COLORS.grid} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: DASHBOARD_CHART_COLORS.text, fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                domain={[0, 20]}
                tickCount={5}
                tick={{ fill: DASHBOARD_CHART_COLORS.textMuted, fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Балл"
                dataKey="value"
                stroke={DASHBOARD_CHART_COLORS.brand}
                fill={DASHBOARD_CHART_COLORS.brand}
                fillOpacity={0.28}
                strokeWidth={2}
                isAnimationActive
              />
              <Tooltip content={<BigFiveTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <ul className="space-y-3">
          {interpretations.map((item) => (
            <li
              key={item.factor}
              className="rounded-2xl border border-black/8 bg-white/75 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-extrabold text-[#5F5E5E]">{item.label}</p>
                <span className="text-[18px] font-extrabold tabular-nums text-[#5F5E5E]">
                  {String(item.score)}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold ${scoreBandBadgeClass(item.band)}`}
                >
                  {scoreBandLabel(item.band)}
                </span>
              </div>
              <p className={`mt-1.5 text-[12px] leading-snug ${adminPanelMutedTextClass}`}>
                {item.meaning}
              </p>
              <p className="mt-2 text-[13px] font-medium leading-snug text-[#5F5E5E]">
                {item.levelText}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BigFiveTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number;
    payload?: { fullLabel?: string; band?: string };
  }>;
}): React.ReactElement | null {
  if (!active || !payload?.[0]) {
    return null;
  }
  const row = payload[0];
  const label = row.payload?.fullLabel ?? "Фактор";
  const band = row.payload?.band ?? "";
  return (
    <div className="rounded-xl bg-[#5F5E5E] px-3 py-2 text-[12px] text-white shadow-lg">
      <p className="font-bold">{label}</p>
      <p className="mt-0.5">
        {String(row.value ?? 0)} из 20
        {band ? ` · ${band}` : ""}
      </p>
    </div>
  );
}
