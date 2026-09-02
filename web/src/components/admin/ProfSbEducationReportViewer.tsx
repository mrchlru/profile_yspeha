"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import type { ProfSbEducationReportView } from "@/lib/profSbEducation/profSbEducationTypes";
import { PROF_SB_EDUCATION_SECTIONS } from "@/lib/profSbEducation/profSbEducationTypes";

/**
 * Просмотр результата анкеты «ПРОФ СБ + ПРОФ образование» в админке.
 */
export function ProfSbEducationReportViewer(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.employeeKey ?? ""));
  const sessionId = decodeURIComponent(String(params.sessionId ?? ""));
  const [view, setView] = useState<ProfSbEducationReportView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sectionLabels = useMemo(
    () => PROF_SB_EDUCATION_SECTIONS.map((section) => section.title),
    []
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ folderKey, sessionId });
        const res = await fetch(`/api/admin/prof-sb-education-report/view?${query.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as { view?: ProfSbEducationReportView; error?: string };
        if (cancelled) {
          return;
        }
        if (!res.ok || !body.view) {
          setError(body.error ?? "Не удалось загрузить результат.");
          setView(null);
          return;
        }
        setView(body.view);
      } catch {
        if (!cancelled) {
          setError("Сеть недоступна.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folderKey, sessionId]);

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка…</p>;
  }

  if (error || !view) {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error ?? "Данные не найдены."}
        </p>
        <Link
          href={`/admin/results/${encodeURIComponent(folderKey)}`}
          className="text-[14px] font-bold text-[#007A68] underline-offset-2 hover:underline"
        >
          ← К папке сотрудника
        </Link>
      </div>
    );
  }

  const pending = view.report?.status !== "computed";

  return (
    <div className="space-y-6">
      <div className={`space-y-3 px-6 py-6 ${adminPanelCardClass}`}>
        <Link
          href={`/admin/results/${encodeURIComponent(folderKey)}`}
          className="text-[14px] font-bold text-[#007A68] underline-offset-2 hover:underline"
        >
          ← К папке сотрудника
        </Link>
        <h1 className={adminPanelSectionTitleClass}>ПРОФ СБ + ПРОФ образование</h1>
        <p className={adminPanelMutedTextClass}>
          {view.personName} · {view.createdAt}
        </p>
        {pending ? (
          <p className="text-[14px] font-medium text-amber-800">
            Интерпретация будет доступна после загрузки методики и ключей подсчёта.
          </p>
        ) : (
          <p className="text-[14px] font-medium text-emerald-800">Интерпретация рассчитана.</p>
        )}
      </div>

      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <h2 className={adminPanelSectionTitleClass}>Блоки анкеты</h2>
        <ul className="list-disc space-y-2 pl-5 text-[14px] text-[#5F5E5E]">
          {sectionLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>

      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <h2 className={adminPanelSectionTitleClass}>Сырые ответы (JSON)</h2>
        <pre className="max-h-[420px] overflow-auto rounded-2xl bg-white/70 p-4 text-[12px] leading-relaxed text-[#4F4F4F]">
          {JSON.stringify(view.answers, null, 2)}
        </pre>
      </div>
    </div>
  );
}
