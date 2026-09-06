"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import type { ProfSbEducationReportView } from "@/lib/profSbEducation/profSbEducationTypes";
import type { Step4ReportSection } from "@/lib/step4/step4Labels";

/**
 * Просмотр результата анкеты «ПРОФ СБ + ПРОФ образование» в админке.
 * Формат как у анкетных данных в отчёте скрининга: блоки с парами ключ–значение.
 */
export function ProfSbEducationReportViewer(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.employeeKey ?? ""));
  const sessionId = decodeURIComponent(String(params.sessionId ?? ""));
  const [view, setView] = useState<ProfSbEducationReportView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      </div>

      {view.questionnaireBlocks.map((block) => (
        <div key={block.title} className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
          <h2 className={adminPanelSectionTitleClass}>{block.title}</h2>
          {block.sections.length === 0 ? (
            <p className={adminPanelMutedTextClass}>Раздел не заполнен.</p>
          ) : (
            <div className="space-y-5">
              {block.sections.map((section) => (
                <QuestionnaireSection key={section.title} section={section} />
              ))}
            </div>
          )}
        </div>
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
      <h3
        className={`text-[15px] font-bold ${
          isEducationConclusion ? "text-[#007A68]" : "text-[#5F5E5E]"
        }`}
      >
        {section.title}
      </h3>
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
