"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { AdminReportAiConclusionSection } from "@/components/admin/AdminReportAiConclusionSection";
import { SpecialistScreeningScalesSection } from "@/components/admin/SpecialistScreeningScalesSection";
import { Button } from "@/components/Button";
import type { SpecialistScreeningReportView } from "@/lib/admin/buildSpecialistScreeningReportView";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";

/**
 * Просмотр конфиденциального скрининга депрессивных симптомов (в стиле отчёта аттестации).
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
    return (
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        <p className={adminPanelMutedTextClass}>Загрузка отчёта…</p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
          <p className="text-sm font-medium text-red-700/90">
            {error ?? "Отчёт не найден."}
          </p>
          <Link
            href={`/admin/results/${encodeURIComponent(folderKey)}`}
            className="inline-flex rounded-full bg-white/80 px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
          >
            ← К папке
          </Link>
        </div>
      </div>
    );
  }

  const verdictClass = view.phq9Item9Positive
    ? "border-red-200 bg-red-50/90 text-red-950"
    : view.referralSuggested
      ? "border-amber-200 bg-amber-50/90 text-amber-950"
      : "border-emerald-200 bg-emerald-50/90 text-emerald-950";

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className={`px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8C8C8C]">
              Скрининг депрессивных симптомов · конфиденциально
            </p>
            <h2 className="mt-1 text-[26px] font-extrabold leading-tight text-[#5F5E5E] sm:text-[30px]">
              {view.personName}
            </h2>
            <p className={`mt-2 ${adminPanelMutedTextClass}`}>
              Пройден: {formatMoscowDateTime(view.createdAt)}
              {view.computedAt ? ` · Рассчитано: ${view.computedAt}` : null}
            </p>
          </div>
          <Link
            href={`/admin/results/${encodeURIComponent(folderKey)}`}
            className="shrink-0 rounded-full bg-white/80 px-4 py-2 text-[14px] font-bold text-[#5F5E5E] transition hover:bg-white"
          >
            ← К папке
          </Link>
        </div>
      </header>

      <AdminReportAiConclusionSection
        conclusionText={view.conclusionText}
        managerActions={view.managerActions}
        conclusionGeneratedAt={view.conclusionGeneratedAt}
        folderKey={folderKey}
        sessionId={sessionId}
        generateApiPath="/api/admin/specialist-screening-report/generate-ai"
        onRegenerated={loadView}
      />

      <section className={`rounded-2xl border px-6 py-5 sm:px-8 ${verdictClass}`}>
        <h3 className="text-[18px] font-extrabold leading-snug">
          {view.interpretation.verdictTitle}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed">{view.interpretation.verdictText}</p>
      </section>

      <SpecialistScreeningScalesSection interpretation={view.interpretation} />

      <section className={`px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
        <h3 className={adminPanelSectionTitleClass}>Рекомендации</h3>
        <p className={`mt-1 mb-4 ${adminPanelMutedTextClass}`}>
          Практические шаги для HRD · скрининг не заменяет очную консультацию специалиста
        </p>
        <ul className="space-y-3">
          {view.interpretation.recommendationLines.map((line) => (
            <li
              key={line}
              className="rounded-2xl border border-black/8 bg-white/75 px-4 py-3 text-[14px] font-medium leading-snug text-[#5F5E5E]"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>

      <Button type="button" variant="secondary" onClick={() => window.history.back()}>
        Назад
      </Button>
    </div>
  );
}
