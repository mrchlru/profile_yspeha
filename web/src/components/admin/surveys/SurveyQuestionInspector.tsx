"use client";

import React from "react";

import { adminInputClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import {
  surveyOutlineButtonClass,
  surveyQuestionCardClass,
} from "@/lib/survey/surveyConstructorTheme";
import { replaceSurveyQuestionType } from "@/lib/survey/surveySchemaMutations";
import {
  SURVEY_ADDABLE_QUESTION_TYPES,
  SURVEY_QUESTION_TYPE_LABELS,
} from "@/lib/survey/surveyQuestionTypeLabels";
import type {
  SurveyMode,
  SurveyQuestion,
  SurveyQuestionType,
  SurveySchemaDocument,
} from "@/lib/survey/surveyTypes";

type SurveyQuestionInspectorProps = {
  mode: SurveyMode;
  schema: SurveySchemaDocument;
  question: SurveyQuestion;
  codeIndex: number;
  onUpdate: (questionId: string, next: SurveyQuestion) => void;
  onDelete: (questionId: string) => void;
  onDuplicate: (questionId: string) => void;
  onMove: (questionId: string, direction: "up" | "down") => void;
};

/**
 * Редактирование выбранного вопроса с превью и ключом для теста.
 */
export function SurveyQuestionInspector({
  mode,
  schema,
  question,
  codeIndex,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
}: SurveyQuestionInspectorProps): React.ReactElement {
  function setType(nextType: SurveyQuestionType): void {
    onUpdate(question.id, replaceSurveyQuestionType(question, nextType, codeIndex));
  }

  function patch(partial: Partial<SurveyQuestion>): void {
    onUpdate(question.id, { ...question, ...partial } as SurveyQuestion);
  }

  return (
    <div className={`${surveyQuestionCardClass} space-y-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-bold uppercase text-[#5F5E5E]">
          {question.code} · {SURVEY_QUESTION_TYPE_LABELS[question.type]}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className={surveyOutlineButtonClass} onClick={() => onMove(question.id, "up")}>
            ↑
          </button>
          <button type="button" className={surveyOutlineButtonClass} onClick={() => onMove(question.id, "down")}>
            ↓
          </button>
          <button type="button" className={surveyOutlineButtonClass} onClick={() => onDuplicate(question.id)}>
            Дублировать
          </button>
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center rounded-full border border-red-200 px-3 text-[13px] font-bold text-red-700"
            onClick={() => onDelete(question.id)}
          >
            Удалить
          </button>
        </div>
      </div>

      <label className="block">
        <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
          Тип вопроса
        </span>
        <select
          className={`${adminInputClass} border border-[#E5E5E5]`}
          value={question.type}
          onChange={(e) => setType(e.target.value as SurveyQuestionType)}
        >
          {SURVEY_ADDABLE_QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {SURVEY_QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
          Текст вопроса
        </span>
        <textarea
          className={`${adminInputClass} min-h-[72px] w-full border border-[#E5E5E5]`}
          value={question.title}
          placeholder="Введите текст"
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>

      {schema.scales.length > 0 ? (
        <label className="block">
          <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
            Шкала (баллы)
          </span>
          <select
            className={`${adminInputClass} border border-[#E5E5E5]`}
            value={question.scaleKey ?? ""}
            onChange={(e) => patch({ scaleKey: e.target.value || null })}
          >
            <option value="">Не начислять</option>
            {schema.scales.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {scale.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={Boolean(question.required)}
          onChange={(e) => patch({ required: e.target.checked })}
        />
        Обязательный вопрос
      </label>

      <ChoiceEditor mode={mode} question={question} onReplace={(next) => onUpdate(question.id, next)} />
      <RatingEditor question={question} onReplace={(next) => onUpdate(question.id, next)} />
      <LinearScaleEditor question={question} onReplace={(next) => onUpdate(question.id, next)} />

      <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-4">
        <p className={`mb-2 text-[12px] font-bold uppercase ${adminPanelMutedTextClass}`}>
          Так увидит респондент
        </p>
        <QuestionRespondentPreview question={question} />
      </div>
    </div>
  );
}

type ChoiceEditorProps = {
  mode: SurveyMode;
  question: SurveyQuestion;
  onReplace: (next: SurveyQuestion) => void;
};

type ChoiceQuestion = Extract<
  SurveyQuestion,
  { type: "single_choice" | "multiple_choice" | "dropdown" }
>;

function ChoiceEditor({ mode, question, onReplace }: ChoiceEditorProps): React.ReactElement | null {
  if (
    question.type !== "single_choice" &&
    question.type !== "multiple_choice" &&
    question.type !== "dropdown"
  ) {
    return null;
  }

  const choiceQuestion = question as ChoiceQuestion;

  function updateOption(optionId: string, label: string): void {
    onReplace({
      ...choiceQuestion,
      options: choiceQuestion.options.map((o) => (o.id === optionId ? { ...o, label } : o)),
    });
  }

  function addOption(): void {
    onReplace({
      ...choiceQuestion,
      options: [
        ...choiceQuestion.options,
        {
          id: crypto.randomUUID(),
          label: `Вариант ${String(choiceQuestion.options.length + 1)}`,
        },
      ],
    });
  }

  function removeOption(optionId: string): void {
    if (choiceQuestion.options.length <= 2) {
      return;
    }
    onReplace({
      ...choiceQuestion,
      options: choiceQuestion.options.filter((o) => o.id !== optionId),
      correctOptionIds: (choiceQuestion.correctOptionIds ?? []).filter((id) => id !== optionId),
    });
  }

  function toggleCorrect(optionId: string): void {
    const current = choiceQuestion.correctOptionIds ?? [];
    const isMulti = question.type === "multiple_choice";
    let next: string[];
    if (isMulti) {
      next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
    } else {
      next = current.includes(optionId) ? [] : [optionId];
    }
    onReplace({ ...choiceQuestion, correctOptionIds: next });
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-bold text-[#1D1D1F]">Варианты ответа</p>
      {choiceQuestion.options.map((opt, index) => (
        <div key={opt.id} className="flex flex-wrap items-center gap-2">
          {mode === "test" ? (
            <input
              type={choiceQuestion.type === "multiple_choice" ? "checkbox" : "radio"}
              name={`correct-${choiceQuestion.id}`}
              checked={(choiceQuestion.correctOptionIds ?? []).includes(opt.id)}
              onChange={() => toggleCorrect(opt.id)}
              title="Правильный ответ"
            />
          ) : null}
          <input
            className={`${adminInputClass} min-w-0 flex-1 border border-[#E5E5E5]`}
            value={opt.label}
            onChange={(e) => updateOption(opt.id, e.target.value)}
            aria-label={`Вариант ${String(index + 1)}`}
          />
          <button type="button" className="text-[13px] text-[#5F5E5E]" onClick={() => removeOption(opt.id)}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className={surveyOutlineButtonClass} onClick={addOption}>
        + Вариант
      </button>
      {mode === "test" ? (
        <p className={`text-[12px] ${adminPanelMutedTextClass}`}>
          Отметьте правильный ответ для публикации теста.
        </p>
      ) : null}
    </div>
  );
}

type RatingEditorProps = {
  question: SurveyQuestion;
  onReplace: (next: SurveyQuestion) => void;
};

function RatingEditor({ question, onReplace }: RatingEditorProps): React.ReactElement | null {
  if (question.type !== "rating") {
    return null;
  }
  const ratingQuestion = question;
  return (
    <div className="flex flex-wrap gap-4">
      <label>
        <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
          Максимум
        </span>
        <select
          className={adminInputClass}
          value={ratingQuestion.max}
          onChange={(e) => onReplace({ ...ratingQuestion, max: Number(e.target.value) })}
        >
          {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {String(n)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
          Иконка
        </span>
        <select
          className={adminInputClass}
          value={ratingQuestion.icon ?? "star"}
          onChange={(e) =>
            onReplace({ ...ratingQuestion, icon: e.target.value as "star" | "heart" })
          }
        >
          <option value="star">Звёзды</option>
          <option value="heart">Сердечки</option>
        </select>
      </label>
    </div>
  );
}

type LinearScaleEditorProps = {
  question: SurveyQuestion;
  onReplace: (next: SurveyQuestion) => void;
};

function LinearScaleEditor({
  question,
  onReplace,
}: LinearScaleEditorProps): React.ReactElement | null {
  if (question.type !== "linear_scale") {
    return null;
  }
  const scaleQuestion = question;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>Мин</span>
        <input
          type="number"
          className={adminInputClass}
          value={scaleQuestion.min}
          onChange={(e) => onReplace({ ...scaleQuestion, min: Number(e.target.value) })}
        />
      </label>
      <label>
        <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>Макс</span>
        <input
          type="number"
          className={adminInputClass}
          value={scaleQuestion.max}
          onChange={(e) => onReplace({ ...scaleQuestion, max: Number(e.target.value) })}
        />
      </label>
      <label className="sm:col-span-2">
        <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
          Подписи краёв
        </span>
        <div className="flex gap-2">
          <input
            className={adminInputClass}
            placeholder="Слева"
            value={scaleQuestion.minLabel ?? ""}
            onChange={(e) => onReplace({ ...scaleQuestion, minLabel: e.target.value })}
          />
          <input
            className={adminInputClass}
            placeholder="Справа"
            value={scaleQuestion.maxLabel ?? ""}
            onChange={(e) => onReplace({ ...scaleQuestion, maxLabel: e.target.value })}
          />
        </div>
      </label>
    </div>
  );
}

function QuestionRespondentPreview({ question }: { question: SurveyQuestion }): React.ReactElement {
  const title = question.title.trim() || "Текст вопроса";

  if (question.type === "rating" && "max" in question) {
    const max = question.max ?? 5;
    const icon = question.icon === "heart" ? "♥" : "★";
    return (
      <div>
        <p className="font-bold">{title}</p>
        <div className="mt-2 flex gap-1 text-[22px] text-[#007A68]">
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className="opacity-40">
              {icon}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "linear_scale" && "min" in question && "max" in question) {
    const nums = [];
    for (let n = question.min; n <= question.max; n += 1) {
      nums.push(n);
    }
    return (
      <div>
        <p className="font-bold">{title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {nums.map((n) => (
            <span
              key={n}
              className="inline-flex size-9 items-center justify-center rounded-full border border-[#E5E5E5] text-[14px] font-bold"
            >
              {String(n)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (
    (question.type === "single_choice" ||
      question.type === "multiple_choice" ||
      question.type === "dropdown") &&
    "options" in question &&
    question.options
  ) {
    return (
      <div>
        <p className="font-bold">{title}</p>
        <ul className="mt-2 space-y-1">
          {question.options.map((o) => (
            <li key={o.id} className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-[14px]">
              {o.label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (question.type === "short_text" || question.type === "long_text") {
    return (
      <div>
        <p className="font-bold">{title}</p>
        <div className="mt-2 h-10 rounded-lg border border-[#E5E5E5] bg-white" />
      </div>
    );
  }

  if (question.type === "section") {
    return <p className="text-[18px] font-extrabold">{title || "Новый раздел"}</p>;
  }

  if (question.type === "title_block") {
    return <p className="text-[20px] font-extrabold">{title}</p>;
  }

  return <p className="font-bold">{title}</p>;
}
