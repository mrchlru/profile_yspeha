"use client";

import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import { CustomSurveyPlayer } from "@/components/survey/CustomSurveyPlayer";
import { CustomSurveyRespondentLayout } from "@/components/survey/CustomSurveyRespondentLayout";
import {
  surveyRespondentCardClass,
  surveyRespondentPrimaryCtaClass,
} from "@/lib/survey/surveyConstructorTheme";
import type { SurveySchemaDocument, SurveySettingsDocument } from "@/lib/survey/surveyTypes";

type Phase = "welcome" | "take" | "done";

/**
 * Прохождение опроса по общей ссылке (без персонального кода).
 */
export default function CustomSurveyOpenPage(): React.ReactElement {
  const params = useParams();
  const tokenRaw = params.token;
  const token = typeof tokenRaw === "string" ? tokenRaw : "";
  const [phase, setPhase] = useState<Phase>("welcome");
  const [schema, setSchema] = useState<SurveySchemaDocument | null>(null);
  const [settings, setSettings] = useState<SurveySettingsDocument | null>(null);
  const [title, setTitle] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Некорректная ссылка");
      return;
    }
    async function load(): Promise<void> {
      try {
        const res = await fetch("/api/survey/public/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = (await res.json()) as {
          schema?: SurveySchemaDocument;
          settings?: SurveySettingsDocument;
          title?: string;
          error?: string;
        };
        if (!res.ok || !body.schema) {
          setError(
            body.error ??
              "Опрос или тест не найден. Возможно, ссылка устарела или материал удалён."
          );
          return;
        }
        setSchema(body.schema);
        setSettings(body.settings ?? null);
        setTitle(body.title ?? body.schema.title ?? "");
      } catch {
        setError("Сеть недоступна");
      }
    }
    void load();
  }, [token]);

  async function beginSurvey(): Promise<void> {
    if (!token) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/survey/public/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json()) as {
        schema?: SurveySchemaDocument;
        responseId?: string;
        error?: string;
      };
      if (!res.ok || !body.schema || !body.responseId) {
        setError(body.error ?? "Не удалось начать опрос");
        return;
      }
      setSchema(body.schema);
      setResponseId(body.responseId);
      setPhase("take");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswers(
    answerRows: Array<{ questionId: string; value: unknown }>
  ): Promise<void> {
    if (!token || !responseId) {
      return;
    }
    const res = await fetch("/api/survey/public/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, responseId, answers: answerRows }),
    });
    if (!res.ok) {
      throw new Error("submit_failed");
    }
    setPhase("done");
  }

  if (error) {
    return (
      <CustomSurveyRespondentLayout centerOnDesktop>
        <div className={`${surveyRespondentCardClass} p-10 text-center`}>
          <h1 className="text-[22px] font-extrabold text-[#1D1D1F]">Опрос недоступен</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5F5E5E]">{error}</p>
        </div>
      </CustomSurveyRespondentLayout>
    );
  }

  if (!schema) {
    return (
      <CustomSurveyRespondentLayout>
        <p className="text-center text-[#5F5E5E]">Загрузка…</p>
      </CustomSurveyRespondentLayout>
    );
  }

  if (phase === "done") {
    return (
      <CustomSurveyRespondentLayout centerOnDesktop>
        <div className={`${surveyRespondentCardClass} p-10 text-center`}>
          <h1 className="text-[24px] font-extrabold text-[#1D1D1F]">
            {settings?.finishTitle ?? "Спасибо!"}
          </h1>
          <p className="mt-2 text-[15px] text-[#5F5E5E]">
            {settings?.finishText ?? "Ваши ответы сохранены."}
          </p>
        </div>
      </CustomSurveyRespondentLayout>
    );
  }

  if (phase === "take" && responseId) {
    return (
      <CustomSurveyRespondentLayout>
        <CustomSurveyPlayer schema={schema} onSubmit={submitAnswers} />
      </CustomSurveyRespondentLayout>
    );
  }

  const welcomeTitle = settings?.welcomeTitle?.trim() || title || schema.title;
  const welcomeText = settings?.welcomeText?.trim();

  return (
    <CustomSurveyRespondentLayout centerOnDesktop>
      <div
        className={`${surveyRespondentCardClass} border-t-[10px] border-t-[#007A68] p-8 sm:p-10`}
      >
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#1D1D1F] sm:text-[32px]">
          {welcomeTitle}
        </h1>
        {schema.description ? (
          <p className="mt-3 text-[16px] leading-relaxed text-[#5F5E5E]">{schema.description}</p>
        ) : null}
        {welcomeText ? (
          <p className="mt-3 text-[16px] leading-relaxed text-[#5F5E5E]">{welcomeText}</p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className={surveyRespondentPrimaryCtaClass}
          onClick={() => void beginSurvey()}
        >
          {busy ? "Подготовка…" : "Начать опрос"}
        </button>
      </div>
    </CustomSurveyRespondentLayout>
  );
}
