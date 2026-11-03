"use client";

import React, { useMemo, useState } from "react";

import type { SurveyQuestion, SurveySchemaDocument } from "@/lib/survey/surveyTypes";
import { SURVEY_QUESTION_TYPE_LABELS } from "@/lib/survey/surveyQuestionTypeLabels";

type CustomSurveyPlayerProps = {
  schema: SurveySchemaDocument;
  readOnly?: boolean;
  onSubmit?: (answers: Array<{ questionId: string; value: unknown }>) => Promise<void>;
};

/**
 * Упрощённый плеер опроса (MVP): текст и варианты выбора.
 */
export function CustomSurveyPlayer({
  schema,
  readOnly = false,
  onSubmit,
}: CustomSurveyPlayerProps): React.ReactElement {
  const answerable = useMemo(
    () =>
      schema.questions.filter((q) => q.type !== "section" && !q.type.endsWith("_block")),
    [schema.questions]
  );
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!onSubmit || readOnly) {
      return;
    }
    setBusy(true);
    try {
      const answers = answerable.map((q) => ({
        questionId: q.id,
        value: values[q.id] ?? null,
      }));
      await onSubmit(answers);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[640px] rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center">
        <h1 className="text-[22px] font-extrabold text-[#1D1D1F]">Спасибо!</h1>
        <p className="mt-2 text-[15px] text-[#5F5E5E]">Ответы отправлены.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4">
      <header className="rounded-2xl border border-[#E5E5E5] border-t-[10px] border-t-[#007A68] bg-white p-6">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em] text-[#1D1D1F]">
          {schema.title}
        </h1>
        {schema.description ? (
          <p className="mt-2 text-[15px] leading-relaxed text-[#5F5E5E]">{schema.description}</p>
        ) : null}
      </header>

      {answerable.map((question, index) => (
        <QuestionBlock
          key={question.id}
          index={index + 1}
          question={question}
          readOnly={readOnly}
          value={values[question.id]}
          onChange={(value) => setValues((prev) => ({ ...prev, [question.id]: value }))}
        />
      ))}

      {!readOnly && onSubmit ? (
        <button
          type="button"
          disabled={busy}
          className="min-h-[48px] rounded-full bg-[#007A68] text-[15px] font-bold text-white disabled:opacity-50"
          onClick={() => void handleSubmit()}
        >
          {busy ? "Отправка…" : "Отправить"}
        </button>
      ) : null}
    </div>
  );
}

type QuestionBlockProps = {
  index: number;
  question: SurveyQuestion;
  readOnly: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
};

function QuestionBlock({
  index,
  question,
  readOnly,
  value,
  onChange,
}: QuestionBlockProps): React.ReactElement {
  return (
    <section className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
      <p className="text-[12px] font-bold uppercase text-[#5F5E5E]">
        {String(index)} · {SURVEY_QUESTION_TYPE_LABELS[question.type]}
      </p>
      <h2 className="mt-1 text-[18px] font-bold text-[#1D1D1F]">
        {question.title}
        {question.required ? <span className="text-[#B54708]"> *</span> : null}
      </h2>
      {question.type === "short_text" || question.type === "long_text" ? (
        <textarea
          className="mt-3 w-full rounded-xl border border-[#E5E5E5] p-3 text-[15px]"
          rows={question.type === "long_text" ? 4 : 2}
          readOnly={readOnly}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
      {(question.type === "single_choice" ||
        question.type === "dropdown" ||
        question.type === "multiple_choice") &&
      "options" in question ? (
        <ul className="mt-3 space-y-2">
          {question.options.map((opt) => {
            const selected =
              question.type === "multiple_choice"
                ? Array.isArray(value) && value.includes(opt.id)
                : value === opt.id;
            return (
              <li key={opt.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E5E5] px-3 py-2 text-[15px]">
                  <input
                    type={question.type === "multiple_choice" ? "checkbox" : "radio"}
                    name={question.id}
                    disabled={readOnly}
                    checked={Boolean(selected)}
                    onChange={() => {
                      if (question.type === "multiple_choice") {
                        const prev = Array.isArray(value) ? value : [];
                        onChange(
                          selected ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                        );
                      } else {
                        onChange(opt.id);
                      }
                    }}
                  />
                  {opt.label}
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
