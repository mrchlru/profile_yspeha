"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { AdminReportAiConclusionSection } from "@/components/admin/AdminReportAiConclusionSection";
import { Button } from "@/components/Button";
import type { SpecialistScreeningReportView } from "@/lib/admin/buildSpecialistScreeningReportView";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";

/**
 * Просмотр конфиденциального скрининга направления к специалисту.
 */
export function SpecialistScreeningReportViewer(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.employeeKey ?? ""));
  const sessionId = decodeURIComponent(String(params.sessionId ?? ""));
  const [view, setView] = useState<SpecialistScreeningReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadView = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ folderKey, sessionId });
      const res = await fetch(
        `/api/admin/specialist-screening-report/view?${query.toString()}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as {
        view?: SpecialistScreeningReportView;
        error?: string;
      };
      if (!res.ok || !body.view) {
        setError(body.error ?? "Не удалось загрузить отчёт.");
        setView(null);
        return;
      }
      setView(body.view);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [folderKey, sessionId]);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка отчёта…</p>;
  }

  if (error || !view) {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <p className="text-sm font-medium text-red-700/90">{error ?? "Отчёт не найден."}</p>
        <Link
          href={`/admin/results/${encodeURIComponent(folderKey)}`}
          className="inline-flex rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К папке
        </Link>
      </div>
    );
  }

  const verdictClass = view.phq9Item9Positive
    ? "border-red-200 bg-red-50 text-red-900"
    : view.referralSuggested
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
            Скрининг депрессивных симптомов · конфиденциально
          </p>
          <h2 className="text-[24px] font-extrabold text-[#5F5E5E]">{view.personName}</h2>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>
            Пройден: {formatMoscowDateTime(view.createdAt)}
            {view.computedAt ? ` · Рассчитано: ${view.computedAt}` : null}
          </p>
        </div>
        <Link
          href={`/admin/results/${encodeURIComponent(folderKey)}`}
          className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К папке
        </Link>
      </div>

      <AdminReportAiConclusionSection
        conclusionText={view.conclusionText}
        managerActions={view.managerActions}
        conclusionGeneratedAt={view.conclusionGeneratedAt}
        folderKey={folderKey}
        sessionId={sessionId}
        generateApiPath="/api/admin/specialist-screening-report/generate-ai"
        onRegenerated={loadView}
      />

      <div className={`rounded-2xl border px-6 py-5 ${verdictClass}`}>
        <h3 className="text-[18px] font-extrabold">{view.interpretation.verdictTitle}</h3>
        <p className="mt-2 text-[15px] leading-relaxed">{view.interpretation.verdictText}</p>
      </div>

      <div className={`overflow-x-auto px-2 py-2 ${adminPanelCardClass}`}>
        <h3 className={`mb-4 px-4 ${adminPanelSectionTitleClass}`}>Результаты по шкалам</h3>
        <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-black/10 text-[#8C8C8C]">
              <th className="px-4 py-3 font-extrabold">Шкала</th>
              <th className="px-4 py-3 font-extrabold">Балл</th>
              <th className="px-4 py-3 font-extrabold">Уровень</th>
              <th className="px-4 py-3 font-extrabold">Ориентиры</th>
            </tr>
          </thead>
          <tbody>
            {[view.interpretation.phq9, view.interpretation.gad7, view.interpretation.asrs].map(
              (row) => (
                <tr key={row.key} className="border-b border-black/5">
                  <td className="px-4 py-3 font-bold text-[#5F5E5E]">{row.title}</td>
                  <td
                    className={`px-4 py-3 font-extrabold ${
                      row.unfavorable ? "text-red-700" : "text-[#007A68]"
                    }`}
                  >
                    {`${String(row.score)} / ${String(row.maxScore)}`}
                  </td>
                  <td className="px-4 py-3">{row.levelLabel}</td>
                  <td className={`px-4 py-3 ${adminPanelMutedTextClass}`}>{row.note}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {view.phq9Item9Positive ? (
          <p className="mt-4 px-4 text-[13px] font-medium text-red-700">
            Вопрос 9 PHQ-9: ответ отличается от «Никогда» — требуется немедленное действие.
          </p>
        ) : null}
      </div>

      <div className={`space-y-3 px-6 py-6 ${adminPanelCardClass}`}>
        <h3 className={adminPanelSectionTitleClass}>Рекомендации</h3>
        <ul className={`list-disc space-y-2 pl-5 ${adminPanelMutedTextClass}`}>
          {view.interpretation.recommendationLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <Button type="button" variant="secondary" onClick={() => window.history.back()}>
        Назад
      </Button>
    </div>
  );
}
