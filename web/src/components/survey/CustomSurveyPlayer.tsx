"use client";

import React, { useMemo, useState } from "react";

import { SURVEY_QUESTION_TYPE_LABELS } from "@/lib/survey/surveyQuestionTypeLabels";
import type { SurveyQuestion, SurveySchemaDocument } from "@/lib/survey/surveyTypes";

type CustomSurveyPlayerProps = {
  schema: SurveySchemaDocument;
  readOnly?: boolean;
  onSubmit?: (answers: Array<{ questionId: string; value: unknown }>) => Promise<void>;
};

function isAnswerableQuestion(question: SurveyQuestion): boolean {
  if (question.type === "section") {
    return false;
  }
  if (
    question.type === "title_block" ||
    question.type === "image_block" ||
    question.type === "video_block"
  ) {
    return false;
  }
  return true;
}

/**
 * Плеер опроса для респондента и предпросмотра.
 */
export function CustomSurveyPlayer({
  schema,
  readOnly = false,
  onSubmit,
}: CustomSurveyPlayerProps): React.ReactElement {
  const answerable = useMemo(
    () => schema.questions.filter(isAnswerableQuestion),
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
      <div className="mx-auto w-full max-w-[720px] rounded-2xl border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
        <h1 className="text-[24px] font-extrabold text-[#1D1D1F] sm:text-[28px]">Спасибо!</h1>
        <p className="mt-2 text-[16px] text-[#5F5E5E]">Ответы отправлены.</p>
      </div>
    );
  }

  const displayTitle = schema.title.trim() || "Без названия";

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 sm:max-w-[840px] lg:max-w-[920px]">
      <header className="rounded-2xl border border-[#E5E5E5] border-t-[10px] border-t-[#007A68] bg-white p-6 shadow-sm sm:p-8">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em] text-[#1D1D1F] sm:text-[32px]">
          {displayTitle}
        </h1>
        {schema.description ? (
          <p className="mt-3 text-[16px] leading-relaxed text-[#5F5E5E]">{schema.description}</p>
        ) : null}
      </header>

      {schema.questions.map((question) => {
        if (question.type === "section") {
          return (
            <div key={question.id} className="border-t border-[#E5E5E5] pt-4">
              <h2 className="text-[20px] font-extrabold text-[#1D1D1F]">
                {question.title.trim() || "Раздел"}
              </h2>
            </div>
          );
        }
        if (question.type === "title_block") {
          return (
            <div key={question.id} className="px-1">
              <h2 className="text-[22px] font-extrabold">{question.title}</h2>
              {question.description ? (
                <p className="mt-1 text-[15px] text-[#5F5E5E]">{question.description}</p>
              ) : null}
            </div>
          );
        }
        if (!isAnswerableQuestion(question)) {
          return null;
        }
        const index = answerable.findIndex((q) => q.id === question.id);
        return (
          <QuestionBlock
            key={question.id}
            index={index + 1}
            question={question}
            readOnly={readOnly}
            value={values[question.id]}
            onChange={(value) => setValues((prev) => ({ ...prev, [question.id]: value }))}
          />
        );
      })}

      {!readOnly && onSubmit ? (
        <button
          type="button"
          disabled={busy}
          className="min-h-[52px] rounded-full bg-[#007A68] text-[16px] font-bold text-white shadow-sm disabled:opacity-50 sm:max-w-[320px] sm:self-center"
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
  const label = SURVEY_QUESTION_TYPE_LABELS[question.type] ?? question.type;

  return (
    <section className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[12px] font-bold uppercase text-[#5F5E5E]">
        {String(index)} · {label}
      </p>
      <h2 className="mt-1 text-[18px] font-bold text-[#1D1D1F]">
        {question.title.trim() || "Без текста"}
        {question.required ? <span className="text-[#B54708]"> *</span> : null}
      </h2>
      <QuestionInput question={question} readOnly={readOnly} value={value} onChange={onChange} />
    </section>
  );
}

type QuestionInputProps = {
  question: SurveyQuestion;
  readOnly: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
};

function QuestionInput({
  question,
  readOnly,
  value,
  onChange,
}: QuestionInputProps): React.ReactElement | null {
  if (question.type === "short_text" || question.type === "long_text") {
    return (
      <textarea
        className="mt-3 w-full rounded-xl border border-[#E5E5E5] p-3 text-[15px]"
        rows={question.type === "long_text" ? 4 : 2}
        readOnly={readOnly}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === "date") {
    return (
      <input
        type="date"
        className="mt-3 rounded-xl border border-[#E5E5E5] p-3 text-[15px]"
        readOnly={readOnly}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === "time") {
    return (
      <input
        type="time"
        className="mt-3 rounded-xl border border-[#E5E5E5] p-3 text-[15px]"
        readOnly={readOnly}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === "dropdown" && "options" in question && question.options?.length) {
    return (
      <select
        className="mt-3 w-full rounded-xl border border-[#E5E5E5] p-3 text-[15px]"
        disabled={readOnly}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Выберите…</option>
        {question.options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (
    (question.type === "single_choice" || question.type === "multiple_choice") &&
    "options" in question &&
    question.options?.length
  ) {
    return (
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
    );
  }

  if (question.type === "linear_scale" && "min" in question && "max" in question) {
    const nums: number[] = [];
    for (let n = question.min; n <= question.max; n += 1) {
      nums.push(n);
    }
    return (
      <div className="mt-3">
        <div className="flex flex-wrap gap-2">
          {nums.map((n) => (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              className={`inline-flex size-10 items-center justify-center rounded-full border text-[14px] font-bold ${
                value === n
                  ? "border-[#007A68] bg-[#DDF1EC] text-[#00594C]"
                  : "border-[#E5E5E5] bg-white"
              }`}
              onClick={() => onChange(n)}
            >
              {String(n)}
            </button>
          ))}
        </div>
        {question.minLabel || question.maxLabel ? (
          <div className="mt-2 flex justify-between text-[12px] text-[#5F5E5E]">
            <span>{question.minLabel}</span>
            <span>{question.maxLabel}</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (question.type === "rating" && "max" in question) {
    const max = question.max ?? 5;
    const icon = question.icon === "heart" ? "♥" : "★";
    const selected = typeof value === "number" ? value : 0;
    return (
      <div className="mt-3 flex gap-1">
        {Array.from({ length: max }, (_, i) => {
          const star = i + 1;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              className={`text-[28px] ${star <= selected ? "text-[#007A68]" : "text-[#E5E5E5]"}`}
              onClick={() => onChange(star)}
              aria-label={`${String(star)} из ${String(max)}`}
            >
              {icon}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "file_upload") {
    return (
      <p className="mt-3 text-[14px] text-[#5F5E5E]">
        {readOnly ? "Поле загрузки файла" : "Загрузка файла (в MVP — заглушка)"}
      </p>
    );
  }

  return (
    <p className="mt-3 text-[14px] text-[#5F5E5E]">Предпросмотр для этого типа скоро.</p>
  );
}
