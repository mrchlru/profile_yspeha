"use client";

import Link from "next/link";
import React, { useState } from "react";

import type {
  SubtestSimilarityAlert,
  SubtestSimilarityFolderSummary,
} from "@/lib/admin/similarityClusterTypes";
import { adminPanelCardClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";

const COLLAPSED_MATCH_PREVIEW = 2;

export type SubtestSimilarityAlertsPanelProps = {
  thresholdPercent: number;
  softThresholdPercent: number;
  closeCompletionMinutes: number;
  summary: SubtestSimilarityFolderSummary | null;
  alerts: ReadonlyArray<SubtestSimilarityAlert>;
  loading?: boolean;
};

/**
 * Плашка подозрительно похожих ответов по субтестам в папке сотрудника.
 */
export function SubtestSimilarityAlertsPanel({
  thresholdPercent,
  softThresholdPercent,
  closeCompletionMinutes,
  summary,
  alerts,
  loading = false,
}: SubtestSimilarityAlertsPanelProps): React.ReactElement | null {
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [expandedSubtests, setExpandedSubtests] = useState<ReadonlySet<string>>(() => new Set());

  if (loading) {
    return (
      <div className={`px-5 py-4 ${adminPanelCardClass}`}>
        <p className={adminPanelMutedTextClass}>Проверка схожести ответов по субтестам…</p>
      </div>
    );
  }

  if (alerts.length === 0 || !summary) {
    return null;
  }

  const hasHigh = summary.highSubtestCount > 0;
  const totalMatches = alerts.reduce((sum, alert) => sum + alert.matches.length, 0);

  function toggleSubtest(key: string): void {
    setExpandedSubtests((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div
      className={`rounded-[28px] border-2 px-5 py-5 shadow-[0px_4px_40px_0px_rgba(0,0,0,0.08)] ${
        hasHigh ? "border-[#F0BCBC] bg-[#FFF3F0]" : "border-[#F0D890] bg-[#FFF8E0]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-extrabold ${hasHigh ? "text-[#8B4513]" : "text-[#92600A]"}`}>
            Похожие ответы: {String(summary.totalAlertSubtests)} субтестов
          </p>
          <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>
            Высокий риск (≥{String(thresholdPercent)}%): {String(summary.highSubtestCount)} · на
            грани ({String(softThresholdPercent)}–{String(thresholdPercent - 1)}%):{" "}
            {String(summary.softSubtestCount)} · {String(totalMatches)} совпадений с людьми.
            {summary.hasCloseInTimeMatch
              ? ` Есть прохождения почти одновременно (≤${String(closeCompletionMinutes)} мин).`
              : null}{" "}
            Проверьте вручную.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPanelExpanded((value) => !value)}
          className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${
            hasHigh
              ? "bg-white/90 text-[#8B4513] hover:bg-white"
              : "bg-white/90 text-[#92600A] hover:bg-white"
          }`}
          aria-expanded={panelExpanded}
        >
          {panelExpanded ? "Свернуть список" : `Развернуть (${String(alerts.length)})`}
        </button>
      </div>

      {panelExpanded ? (
        <ul className="mt-4 max-h-[min(70vh,720px)] space-y-3 overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const subtestKey = `${alert.testKind}:${alert.subtestId}`;
            const isHigh = alert.maxSeverity === "high";
            const subtestExpanded = expandedSubtests.has(subtestKey);
            const matchCount = alert.matches.length;
            const visibleMatches = subtestExpanded
              ? alert.matches
              : alert.matches.slice(0, COLLAPSED_MATCH_PREVIEW);
            const hiddenCount = matchCount - visibleMatches.length;

            return (
              <li
                key={subtestKey}
                className={`rounded-2xl border bg-white/80 px-4 py-3 ${
                  isHigh ? "border-[#F0BCBC]/60" : "border-[#F0D890]/80"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-[14px] font-bold text-[#5F5E5E]">
                    <span
                      className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                        isHigh ? "bg-[#FFE8E8] text-[#B45309]" : "bg-[#FFF3C4] text-[#92600A]"
                      }`}
                    >
                      {isHigh ? "≥65%" : "60–64%"}
                    </span>
                    {alert.subtestLabel}
                    <span className={`ml-2 text-[12px] font-semibold ${adminPanelMutedTextClass}`}>
                      ({alert.testKindLabel})
                    </span>
                  </p>
                  {matchCount > COLLAPSED_MATCH_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => toggleSubtest(subtestKey)}
                      className="shrink-0 text-[12px] font-bold text-[#007A68] underline-offset-2 hover:underline"
                      aria-expanded={subtestExpanded}
                    >
                      {subtestExpanded
                        ? "Свернуть"
                        : `Ещё ${String(hiddenCount)} из ${String(matchCount)}`}
                    </button>
                  ) : (
                    <span className={`shrink-0 text-[12px] ${adminPanelMutedTextClass}`}>
                      {String(matchCount)} совп.
                    </span>
                  )}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {visibleMatches.map((match) => (
                    <li
                      key={match.otherFolderKey}
                      className="flex flex-wrap items-baseline gap-x-2 text-[13px]"
                    >
                      <span
                        className={`font-bold ${match.severity === "high" ? "text-[#B45309]" : "text-[#92600A]"}`}
                      >
                        ~{String(match.similarityPercent)}%
                      </span>
                      <span className="text-[#5F5E5E]">совпадение с</span>
                      <Link
                        href={`/admin/results/${encodeURIComponent(match.otherFolderKey)}`}
                        className="font-bold text-[#007A68] underline-offset-2 hover:underline"
                      >
                        {match.otherDisplayName}
                      </Link>
                      {match.closeInTime && match.completedAtGapMinutes !== null ? (
                        <span className="text-[12px] font-semibold text-[#C0392B]">
                          · через {String(match.completedAtGapMinutes)} мин
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
