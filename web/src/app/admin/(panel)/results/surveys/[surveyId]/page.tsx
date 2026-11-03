"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { surveyCardClass, surveyMutedTextClass } from "@/lib/survey/surveyConstructorTheme";

type ResponseRow = {
  id: string;
  submittedAt: string | null;
  accessInviteCode: string | null;
  answerCount: number;
};

/**
 * Результаты одного собственного опроса (группа «Собственные опросы»).
 */
export default function AdminSurveyResultsPage(): React.ReactElement {
  const params = useParams();
  const surveyIdRaw = params.surveyId;
  const surveyId = typeof surveyIdRaw === "string" ? surveyIdRaw : "";
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      setLoading(false);
      setError("Некорректный адрес страницы");
      return;
    }
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/surveys/${encodeURIComponent(surveyId)}/responses`);
        const body = (await res.json()) as {
          survey?: { title: string };
          items?: ResponseRow[];
          error?: string;
        };
        if (!res.ok) {
          setError(body.error ?? "Не удалось загрузить");
          setItems([]);
          return;
        }
        setTitle(body.survey?.title ?? "");
        setItems(body.items ?? []);
      } catch {
        setError("Сеть недоступна");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [surveyId]);

  return (
    <AdminShell title="Результаты опроса">
      <div className="mx-auto max-w-[900px] space-y-4">
        <Link href="/admin/surveys" className="text-[14px] font-bold text-[#007A68]">
          ← К опросам
        </Link>
        <h1 className="text-[26px] font-extrabold text-[#1D1D1F]">{title || "Опрос"}</h1>
        <p className={`text-[14px] ${surveyMutedTextClass}`}>Собственные опросы</p>
        {loading ? <p className={surveyMutedTextClass}>Загрузка…</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className={surveyMutedTextClass}>Ответов пока нет.</p>
        ) : null}
        {!loading && items.length > 0 ? (
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
        ) : null}
      </div>
    </AdminShell>
  );
}
