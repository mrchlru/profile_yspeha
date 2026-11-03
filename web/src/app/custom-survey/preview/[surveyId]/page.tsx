"use client";

import React, { useEffect, useState } from "react";

import { CustomSurveyPlayer } from "@/components/survey/CustomSurveyPlayer";
import type { SurveyDraftPayload } from "@/lib/survey/surveyTypes";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

/**
 * Предпросмотр черновика (только для авторизованной админ-сессии).
 */
export default function CustomSurveyPreviewPage(props: PageProps): React.ReactElement {
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SurveyDraftPayload | null>(null);
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
        const res = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}/draft`);
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
