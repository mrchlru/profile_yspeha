"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { surveyCardClass, surveyMutedTextClass } from "@/lib/survey/surveyConstructorTheme";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

type ResponseRow = {
  id: string;
  submittedAt: string | null;
  accessInviteCode: string | null;
  answerCount: number;
};

/**
 * Результаты одного собственного опроса (группа «Собственные опросы»).
 */
export default function AdminSurveyResultsPage(props: PageProps): React.ReactElement {
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ResponseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void props.params.then((p) => setSurveyId(p.surveyId));
  }, [props.params]);

  useEffect(() => {
    if (!surveyId) {
      return;
    }
    async function load(): Promise<void> {
      try {
        const id = surveyId;
        if (!id) {
          return;
        }
        const res = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}/responses`);
        const body = (await res.json()) as {
          survey?: { title: string };
          items?: ResponseRow[];
          error?: string;
        };
        if (!res.ok) {
          setError(body.error ?? "Не удалось загрузить");
          return;
        }
        setTitle(body.survey?.title ?? "");
        setItems(body.items ?? []);
      } catch {
        setError("Сеть недоступна");
      }
    }
    void load();
  }, [surveyId]);

  return (
    <AdminShell title="Результаты опроса">
      <div className="mx-auto max-w-[900px] space-y-4">
        <Link href="/admin/results" className="text-[14px] font-bold text-[#007A68]">
          ← К результатам
        </Link>
        <h1 className="text-[26px] font-extrabold text-[#1D1D1F]">{title || "Опрос"}</h1>
        <p className={`text-[14px] ${surveyMutedTextClass}`}>Собственные опросы · source=custom</p>
        {error ? <p className="text-red-700">{error}</p> : null}
        {items.length === 0 ? (
          <p className={surveyMutedTextClass}>Ответов пока нет.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className={surveyCardClass}>
                <div className="text-[15px] font-bold">
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleString("ru-RU")
                    : "Без даты"}
                </div>
                <div className={`text-[13px] ${surveyMutedTextClass}`}>
                  Код: {item.accessInviteCode ?? "—"} · ответов: {String(item.answerCount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
