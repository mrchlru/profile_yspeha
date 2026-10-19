"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { RegenerateDocumentReportButton } from "@/components/admin/RegenerateDocumentReportButton";
import type { ProfSbEducationReportView } from "@/lib/profSbEducation/profSbEducationTypes";
import type { Step4ReportSection } from "@/lib/step4/step4Labels";

const ADMIN_REPORT_PAGE_CLASS =
  "mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6 sm:px-6 lg:px-8";

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

  const loadView = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ folderKey, sessionId });
      const res = await fetch(`/api/admin/prof-sb-education-report/view?${query.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as { view?: ProfSbEducationReportView; error?: string };
      if (!res.ok || !body.view) {
        setError(body.error ?? "Не удалось загрузить результат.");
        setView(null);
        return;
      }
      setView(body.view);
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setLoading(false);
    }
  }, [folderKey, sessionId]);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  if (loading) {
    return (
      <div className={ADMIN_REPORT_PAGE_CLASS}>
        <p className={adminPanelMutedTextClass}>Загрузка…</p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className={ADMIN_REPORT_PAGE_CLASS}>
        <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
          <p className="text-sm font-medium text-red-700/90" role="alert">
            {error ?? "Данные не найдены."}
          </p>
          <Link
            href={`/admin/results/${encodeURIComponent(folderKey)}`}
            className="inline-flex rounded-full bg-white/80 px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
          >
            ← К папке сотрудника
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={ADMIN_REPORT_PAGE_CLASS}>
      <header className={`px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8C8C8C]">
              ПРОФ СБ + ПРОФ образование
            </p>
            <h2 className="mt-1 text-[26px] font-extrabold leading-tight text-[#5F5E5E] sm:text-[30px]">
              {view.personName}
            </h2>
            <p className={`mt-2 ${adminPanelMutedTextClass}`}>Пройден: {view.createdAt}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RegenerateDocumentReportButton
              folderKey={folderKey}
              sessionId={sessionId}
              kind="prof_sb_education"
              regenerateAi={false}
              onSuccess={loadView}
            />
            <Link
              href={`/admin/results/${encodeURIComponent(folderKey)}`}
              className="shrink-0 rounded-full bg-white/80 px-4 py-2 text-[14px] font-bold text-[#5F5E5E] transition hover:bg-white"
            >
              ← К папке
            </Link>
          </div>
        </div>
      </header>

      {view.questionnaireBlocks.map((block) => (
        <section key={block.title} className={`space-y-4 px-6 py-6 sm:px-8 ${adminPanelCardClass}`}>
          <h3 className={adminPanelSectionTitleClass}>{block.title}</h3>
          {block.sections.length === 0 ? (
            <p className={adminPanelMutedTextClass}>Раздел не заполнен.</p>
          ) : (
            <div className="space-y-5">
              {block.sections.map((section) => (
                <QuestionnaireSection key={section.title} section={section} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function QuestionnaireSection({
  section,
}: {
  section: Step4ReportSection;
}): React.ReactElement {
  const isEducationConclusion = section.title === "Заключение по образованию и обучению";

  return (
    <div className="space-y-2">
      <h4
        className={`text-[15px] font-bold ${
          isEducationConclusion ? "text-[#007A68]" : "text-[#5F5E5E]"
        }`}
      >
        {section.title}
      </h4>
      {section.rows.map((row) =>
        isEducationConclusion ? (
          <p key={row.key} className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#5F5E5E]">
            {row.value}
          </p>
        ) : (
          <p key={`${row.key}:${row.value}`} className="text-[14px] leading-relaxed text-[#5F5E5E]">
            <span className="font-semibold text-[#4A4A4A]">{row.key}: </span>
            {row.value}
          </p>
        )
      )}
      {section.groups?.map((group) => (
        <div key={group.heading} className="space-y-1 pl-1">
          <p className="text-[13px] font-semibold text-[#8C8C8C]">{group.heading}</p>
          {group.rows.map((row) => (
            <p key={`${group.heading}:${row.key}`} className="text-[14px] leading-relaxed text-[#5F5E5E]">
              <span className="font-semibold text-[#4A4A4A]">{row.key}: </span>
              {row.value}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
