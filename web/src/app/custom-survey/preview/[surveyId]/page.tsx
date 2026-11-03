"use client";

import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { CustomSurveyPlayer } from "@/components/survey/CustomSurveyPlayer";
import type { SurveyDraftPayload } from "@/lib/survey/surveyTypes";

/**
 * Предпросмотр черновика (только для авторизованной админ-сессии).
 */
export default function CustomSurveyPreviewPage(): React.ReactElement {
  const params = useParams();
  const surveyIdRaw = params.surveyId;
  const surveyId = typeof surveyIdRaw === "string" ? surveyIdRaw : "";
  const [draft, setDraft] = useState<SurveyDraftPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      setError("Некорректный адрес");
      return;
    }
    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/admin/surveys/${encodeURIComponent(surveyId)}/draft`);
        const body = (await res.json()) as SurveyDraftPayload & { error?: string };
        if (!res.ok) {
          setError(body.error ?? "Нет доступа к предпросмотру");
          return;
        }
        setDraft(body);
      } catch {
        setError("Сеть недоступна");
      }
    }
    void load();
  }, [surveyId]);

  return (
    <div className="min-h-screen bg-[#F4F6F5] px-4 py-10">
      {error ? (
        <p className="text-center text-red-700">{error}</p>
      ) : draft ? (
        <CustomSurveyPlayer schema={draft.schema} readOnly />
      ) : (
        <p className="text-center text-[#5F5E5E]">Загрузка…</p>
      )}
    </div>
  );
}
