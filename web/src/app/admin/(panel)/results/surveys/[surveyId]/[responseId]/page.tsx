"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  formatSurveyAnswerForDisplay,
  surveyQuestionsById,
} from "@/lib/survey/formatSurveyAnswerForDisplay";
import { surveyCardClass, surveyMutedTextClass } from "@/lib/survey/surveyConstructorTheme";
import { SURVEY_QUESTION_TYPE_LABELS } from "@/lib/survey/surveyQuestionTypeLabels";
import type { SurveyQuestion, SurveySchemaDocument } from "@/lib/survey/surveyTypes";

type AnswerRow = { questionId: string; value: unknown };

type ResponseMeta = {
  id: string;
  submittedAt: string | null;
  accessInviteCode: string | null;
  source: string;
  status: string;
};

function isDisplayableQuestion(question: SurveyQuestion): boolean {
  return (
    question.type !== "section" &&
    question.type !== "title_block" &&
    question.type !== "image_block" &&
    question.type !== "video_block"
  );
}

/**
 * Детальный просмотр одного ответа на собственный опрос.
 */
export default function AdminSurveyResponseDetailPage(): React.ReactElement {
  const params = useParams();
  const surveyId = typeof params.surveyId === "string" ? params.surveyId : "";
  const responseId = typeof params.responseId === "string" ? params.responseId : "";
  const [surveyTitle, setSurveyTitle] = useState("");
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [schema, setSchema] = useState<SurveySchemaDocument | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId || !responseId) {
      setLoading(false);
      setError("Некорректный адрес");
      return;
    }
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/surveys/${encodeURIComponent(surveyId)}/responses/${encodeURIComponent(responseId)}`
        );
        const body = (await res.json()) as {
          surveyTitle?: string;
          response?: ResponseMeta;
          schema?: SurveySchemaDocument;
          answers?: AnswerRow[];
          error?: string;
        };
        if (!res.ok) {
          setError(body.error ?? "Не удалось загрузить");
          return;
        }
        setSurveyTitle(body.surveyTitle ?? "");
        setMeta(body.response ?? null);
        setSchema(body.schema ?? null);
        setAnswers(body.answers ?? []);
      } catch {
        setError("Сеть недоступна");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [surveyId, responseId]);

  const questionsMap = useMemo(
    () => (schema ? surveyQuestionsById(schema) : new Map()),
    [schema]
  );

  const orderedRows = useMemo((): Array<{ question: SurveyQuestion; value: unknown }> => {
    if (!schema) {
      return [];
    }
    const answerByQ = new Map(answers.map((a) => [a.questionId, a.value]));
    return schema.questions
      .filter(isDisplayableQuestion)
      .map((q) => ({
        question: q,
        value: answerByQ.get(q.id),
      }));
  }, [schema, answers]);

  return (
    <AdminShell title="Ответ на опрос">
      <div className="mx-auto max-w-[900px] space-y-4">
        <Link
          href={`/admin/results/surveys/${encodeURIComponent(surveyId)}`}
          className="text-[14px] font-bold text-[#007A68]"
        >
          ← К списку ответов
        </Link>
        <h1 className="text-[26px] font-extrabold text-[#1D1D1F]">{surveyTitle || "Опрос"}</h1>
        {loading ? <p className={surveyMutedTextClass}>Загрузка…</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}
        {meta ? (
          <div className={`${surveyCardClass} text-[14px]`}>
            <div className="font-bold">
              {meta.submittedAt
                ? new Date(meta.submittedAt).toLocaleString("ru-RU")
                : "Без даты отправки"}
            </div>
            <p className={`mt-1 ${surveyMutedTextClass}`}>
              {meta.source === "public_link"
                ? "Общая ссылка"
                : `Код: ${meta.accessInviteCode ?? "—"}`}
            </p>
          </div>
        ) : null}
        {!loading && !error && orderedRows.length > 0 ? (
          <ul className="space-y-3">
            {orderedRows.map(({ question, value }, index) => (
              <li key={question.id} className={surveyCardClass}>
                <p className="text-[12px] font-bold uppercase text-[#5F5E5E]">
                  {String(index + 1)} ·{" "}
                  {(SURVEY_QUESTION_TYPE_LABELS as Record<string, string>)[question.type] ??
                    question.type}
                </p>
                <h2 className="mt-1 text-[16px] font-bold text-[#1D1D1F]">
                  {question.title.trim() || "Без текста"}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[#1D1D1F]">
                  {formatSurveyAnswerForDisplay(question, value)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </AdminShell>
  );
}
