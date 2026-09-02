"use client";

import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
} from "@/lib/stepPageTheme";
import type {
  AuditStep21Option,
  AuditStep21Question,
} from "@/lib/audit/questions/step21Gerchikov";

export type AuditGerchikovValue =
  | string
  | ReadonlyArray<string>
  | null;

export type AuditGerchikovAnswers = Readonly<
  Record<string, AuditGerchikovValue>
>;

export type AuditGerchikovListProps = {
  questions: ReadonlyArray<AuditStep21Question>;
  answers: AuditGerchikovAnswers;
  /**
   * Записать ответ. Для single-вариантов и числовых полей значение — `string`,
   * для multi/матрицы/стажа — `ReadonlyArray<string>`. Хранение в сторе через
   * универсальный `setAuditAnswer`, поэтому здесь всегда отдаём «сырой» payload.
   */
  onAnswer: (questionId: string, value: string | ReadonlyArray<string>) => void;
};

/**
 * Список пунктов шага 21 (мотивация и стимулирование). Под каждый тип
 * вопроса — отдельная карточка-рендерер: одиночный выбор, множественный
 * выбор «1–2», множественный выбор без ограничений, матрица важности
 * по 9 строкам, числовое поле возраста, составное поле стажа и
 * ветвящийся пункт «руководитель / не руководитель».
 *
 * Сам компонент не считает прогресс и не лезет в стор; он только
 * рисует карточки и проксирует выбор наверх — счётчик «отвечено N / 16»
 * вычисляется в теле шага через `countAuditStep21Answered`.
 */
export function AuditGerchikovList({
  questions,
  answers,
  onAnswer,
}: AuditGerchikovListProps): React.ReactElement {
  const positionAnswer = answers["q1"];
  const isManager =
    typeof positionAnswer === "string" && positionAnswer === "manager";

  return (
    <ol className="space-y-3" type="1">
      {questions.map((question, idx) => (
        <li
          key={question.id}
          className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}
        >
          <_QuestionCardHeader
            displayIndex={idx + 1}
            sourceLabel={question.sourceLabel}
            prompt={_promptFor(question, isManager)}
          />
          {"hint" in question && question.hint ? (
            <p className="mb-3 text-[13px] text-[#7F7F7F]">{question.hint}</p>
          ) : null}
          <_QuestionBody
            question={question}
            value={answers[question.id] ?? null}
            isManager={isManager}
            onAnswer={onAnswer}
          />
        </li>
      ))}
    </ol>
  );
}

function _promptFor(
  question: AuditStep21Question,
  isManager: boolean
): string {
  if (question.kind === "branched_18") {
    return isManager ? question.managerPrompt : question.nonManagerPrompt;
  }
  return question.prompt;
}

function _QuestionCardHeader({
  displayIndex,
  sourceLabel,
  prompt,
}: {
  displayIndex: number;
  sourceLabel: string;
  prompt: string;
}): React.ReactElement {
  return (
    <p className={`${stepQuestionTitleClass} mb-2`}>
      <span className="mr-2 text-[#00B596]">{`${String(displayIndex)}.`}</span>
      {prompt}
      <span className="ml-2 text-[12px] font-medium uppercase tracking-wide text-[#9B9B9B]">
        {`(вопрос ${sourceLabel})`}
      </span>
    </p>
  );
}

function _QuestionBody({
  question,
  value,
  isManager,
  onAnswer,
}: {
  question: AuditStep21Question;
  value: AuditGerchikovValue;
  isManager: boolean;
  onAnswer: (id: string, v: string | ReadonlyArray<string>) => void;
}): React.ReactElement {
  switch (question.kind) {
    case "passport_single":
    case "single":
      return (
        <_SingleChoice
          options={question.options}
          value={typeof value === "string" ? value : null}
          onPick={(id) => onAnswer(question.id, id)}
        />
      );
    case "passport_number":
      return (
        <_NumberInput
          placeholder={question.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => onAnswer(question.id, next)}
        />
      );
    case "passport_tenure":
      return (
        <_TenureInput
          value={Array.isArray(value) ? (value as ReadonlyArray<string>) : null}
          onChange={(years, months) => onAnswer(question.id, [years, months])}
        />
      );
    case "multi_one_or_two":
      return (
        <_MultiChoice
          options={question.options}
          maxSelected={2}
          value={Array.isArray(value) ? (value as ReadonlyArray<string>) : []}
          onChange={(next) => onAnswer(question.id, next)}
        />
      );
    case "multi_any":
      return (
        <_MultiChoice
          options={question.options}
          maxSelected={null}
          value={Array.isArray(value) ? (value as ReadonlyArray<string>) : []}
          onChange={(next) => onAnswer(question.id, next)}
        />
      );
    case "matrix_importance":
      return (
        <_MatrixImportance
          rows={question.rows}
          columns={question.columns}
          value={Array.isArray(value) ? (value as ReadonlyArray<string>) : []}
          onChange={(next) => onAnswer(question.id, next)}
        />
      );
    case "branched_18":
      return (
        <_MultiChoice
          options={isManager ? question.managerOptions : question.nonManagerOptions}
          maxSelected={2}
          value={Array.isArray(value) ? (value as ReadonlyArray<string>) : []}
          onChange={(next) => onAnswer(question.id, next)}
        />
      );
  }
}

function _SingleChoice({
  options,
  value,
  onPick,
}: {
  options: ReadonlyArray<AuditStep21Option>;
  value: string | null;
  onPick: (id: string) => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <_PrimaryToggleButton
          key={option.id}
          isActive={value === option.id}
          label={option.label}
          onClick={() => onPick(option.id)}
        />
      ))}
    </div>
  );
}

function _MultiChoice({
  options,
  maxSelected,
  value,
  onChange,
}: {
  options: ReadonlyArray<AuditStep21Option>;
  maxSelected: number | null;
  value: ReadonlyArray<string>;
  onChange: (next: ReadonlyArray<string>) => void;
}): React.ReactElement {
  function toggle(id: string): void {
    const has = value.includes(id);
    if (has) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (maxSelected !== null && value.length >= maxSelected) {
      return;
    }
    onChange([...value, id]);
  }
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const isActive = value.includes(option.id);
        const isDisabled =
          !isActive && maxSelected !== null && value.length >= maxSelected;
        return (
          <_PrimaryToggleButton
            key={option.id}
            isActive={isActive}
            isDisabled={isDisabled}
            label={option.label}
            onClick={() => toggle(option.id)}
          />
        );
      })}
      {maxSelected !== null ? (
        <p className="mt-1 text-[12px] text-[#9B9B9B]">
          {`Выбрано ${String(value.length)} из ${String(maxSelected)}`}
        </p>
      ) : null}
    </div>
  );
}

function _MatrixImportance({
  rows,
  columns,
  value,
  onChange,
}: {
  rows: ReadonlyArray<{ id: string; label: string }>;
  columns: ReadonlyArray<AuditStep21Option>;
  value: ReadonlyArray<string>;
  onChange: (next: ReadonlyArray<string>) => void;
}): React.ReactElement {
  function pick(rowIdx: number, columnId: string): void {
    const next = rows.map((_, i) => {
      if (i === rowIdx) {
        return columnId;
      }
      return value[i] ?? "";
    });
    onChange(next);
  }
  return (
    <div className="space-y-2">
      {rows.map((row, rowIdx) => {
        const current = value[rowIdx] ?? "";
        return (
          <div
            key={row.id}
            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3"
          >
            <p className="mb-2 text-[14px] font-medium text-[#404040]">
              {row.label}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {columns.map((column) => (
                <_PrimaryToggleButton
                  key={column.id}
                  isActive={current === column.id}
                  label={column.label}
                  onClick={() => pick(rowIdx, column.id)}
                  compact
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function _NumberInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}): React.ReactElement {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(_sanitizeDigits(e.target.value))}
      className="w-full max-w-[200px] rounded-2xl border border-black/10 bg-white/85 px-4 py-3 text-[16px] font-semibold text-[#404040] focus:border-[#00B596] focus:outline-none focus:ring-2 focus:ring-[#00B596]/35"
    />
  );
}

function _TenureInput({
  value,
  onChange,
}: {
  value: ReadonlyArray<string> | null;
  onChange: (years: string, months: string) => void;
}): React.ReactElement {
  const years = value?.[0] ?? "";
  const months = value?.[1] ?? "";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-[14px] text-[#5F5E5E]">
        <span>Лет</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={years}
          onChange={(e) =>
            onChange(_sanitizeDigits(e.target.value), months)
          }
          className="w-[110px] rounded-2xl border border-black/10 bg-white/85 px-3 py-2 text-[16px] font-semibold text-[#404040] focus:border-[#00B596] focus:outline-none focus:ring-2 focus:ring-[#00B596]/35"
        />
      </label>
      <label className="flex items-center gap-2 text-[14px] text-[#5F5E5E]">
        <span>Месяцев</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={months}
          onChange={(e) =>
            onChange(years, _sanitizeDigits(e.target.value))
          }
          className="w-[110px] rounded-2xl border border-black/10 bg-white/85 px-3 py-2 text-[16px] font-semibold text-[#404040] focus:border-[#00B596] focus:outline-none focus:ring-2 focus:ring-[#00B596]/35"
        />
      </label>
    </div>
  );
}

function _PrimaryToggleButton({
  isActive,
  isDisabled = false,
  label,
  onClick,
  compact = false,
}: {
  isActive: boolean;
  isDisabled?: boolean;
  label: string;
  onClick: () => void;
  compact?: boolean;
}): React.ReactElement {
  const base = compact
    ? "w-full rounded-xl px-3 py-2 text-left text-[13px] sm:text-[14px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35"
    : "w-full rounded-2xl px-4 py-3 text-left text-[15px] sm:text-[16px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
  const activeCls =
    "bg-[#00B596] text-white shadow-[0px_4px_18px_0px_rgba(0,181,150,0.35)]";
  const inactiveCls =
    "bg-white/85 text-[#5F5E5E] hover:bg-white border border-black/10";
  const disabledCls = "opacity-50 cursor-not-allowed";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`${base} ${isActive ? activeCls : inactiveCls} ${
        isDisabled ? disabledCls : ""
      }`}
    >
      {label}
    </button>
  );
}

function _sanitizeDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 4);
}
