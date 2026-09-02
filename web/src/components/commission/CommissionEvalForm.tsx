"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { CommissionQuestionBankPicker } from "@/components/commission/CommissionQuestionBankPicker";
import { StepLayout } from "@/components/StepLayout";
import type { CommissionEvalSheetPublicView } from "@/lib/commission/commissionEvalSheets";
import {
  COMMISSION_SCALE_MAX,
  COMMISSION_SCALE_MIN,
  COMMISSION_VARIABLE_QUESTION_COUNT,
  type CommissionScaleAnswers,
  type CommissionVariableAnswer,
} from "@/lib/commission/commissionEvalConstants";
import { normalizeCommissionQuestionText } from "@/lib/commission/commissionQuestionTextUtils";
import {
  commissionEvalBodyTextClass,
  commissionEvalBankButtonClass,
  commissionEvalCardClass,
  commissionEvalInputClass,
  commissionEvalLabelClass,
  commissionEvalPageClass,
  commissionEvalPrimaryButtonClass,
  commissionEvalSafeBottomClass,
  commissionEvalSecondaryButtonClass,
  commissionEvalSectionTitleClass,
  commissionEvalStickyActionsClass,
  commissionEvalTextareaClass,
  commissionEvalTitleClass,
  commissionScaleButtonClass,
  commissionScaleGridClass,
} from "@/lib/commission/commissionEvalTheme";
import { stepSecondaryTextClass } from "@/lib/stepPageTheme";

export type CommissionEvalFormProps = {
  accessToken: string;
};

type ScaleProgress = {
  filled: number;
  total: number;
};

/**
 * Публичная форма оценочного листа комиссии по токену.
 */
export function CommissionEvalForm({
  accessToken,
}: CommissionEvalFormProps): React.ReactElement {
  const [sheet, setSheet] = useState<CommissionEvalSheetPublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scaleAnswers, setScaleAnswers] = useState<CommissionScaleAnswers>(_emptyScaleAnswers);
  const [variableAnswers, setVariableAnswers] = useState<CommissionVariableAnswer[]>(
    _emptyVariableAnswers(null)
  );
  const [bankPickerIndex, setBankPickerIndex] = useState<number | null>(null);

  const isSubmitted = sheet?.status === "submitted";
  const lockedQuestions = sheet?.lockedVariableQuestions ?? null;

  const loadSheet = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/commission/eval/${encodeURIComponent(accessToken)}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as { sheet?: CommissionEvalSheetPublicView; error?: string };
      if (!res.ok || !body.sheet) {
        setSheet(null);
        setError(body.error ?? "Ссылка недействительна.");
        return;
      }
      setSheet(body.sheet);
      setScaleAnswers(body.sheet.scaleAnswers ?? _emptyScaleAnswers());
      setVariableAnswers(
        body.sheet.variableAnswers?.length === COMMISSION_VARIABLE_QUESTION_COUNT
          ? [...body.sheet.variableAnswers]
          : _emptyVariableAnswers(body.sheet.lockedVariableQuestions)
      );
    } catch {
      setSheet(null);
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadSheet();
  }, [loadSheet]);

  const scaleOptions = useMemo(() => _buildScaleOptions(), []);

  const scaleProgress = useMemo((): ScaleProgress | null => {
    if (!sheet) {
      return null;
    }
    const filled = sheet.fixedQuestions.filter(
      (question) => typeof scaleAnswers[question.id] === "number"
    ).length;
    return { filled, total: sheet.fixedQuestions.length };
  }, [sheet, scaleAnswers]);

  async function saveDraft(): Promise<void> {
    await _submit(false);
  }

  async function submitFinal(): Promise<void> {
    if (!window.confirm("Отправить анкету? После отправки изменить ответы будет нельзя.")) {
      return;
    }
    await _submit(true);
  }

  async function _submit(submit: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/commission/eval/${encodeURIComponent(accessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scaleAnswers, variableAnswers, submit }),
      });
      const body = (await res.json()) as { submitted?: boolean; error?: string };
      if (!res.ok) {
        return;
      }
      if (body.submitted) {
        setSuccess("Анкета отправлена. Спасибо!");
      } else {
        setSuccess("Черновик сохранён.");
      }
      await loadSheet();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  function updateScale(questionId: string, value: number): void {
    setScaleAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function updateVariable(index: number, patch: Partial<CommissionVariableAnswer>): void {
    setVariableAnswers((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  if (loading) {
    return (
      <StepLayout hideHeaderTitle compactHeader>
        <div className={`${commissionEvalPageClass} py-16 text-center`}>
          <p className={stepSecondaryTextClass}>Загрузка анкеты…</p>
        </div>
      </StepLayout>
    );
  }

  if (error && !sheet) {
    return (
      <StepLayout hideHeaderTitle compactHeader>
        <div className={`${commissionEvalPageClass} py-12 sm:py-16`}>
          <div className={commissionEvalCardClass}>
            <p className="text-sm font-medium text-red-700/90">{error}</p>
          </div>
        </div>
      </StepLayout>
    );
  }

  if (!sheet) {
    return (
      <StepLayout hideHeaderTitle compactHeader>
        <div className={`${commissionEvalPageClass} py-16 text-center`}>
          <p className={stepSecondaryTextClass}>Анкета не найдена.</p>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout hideHeaderTitle compactHeader>
      <div
        className={`${commissionEvalPageClass} ${commissionEvalSafeBottomClass} space-y-4 sm:space-y-6 ${
          !isSubmitted ? "pb-24 sm:pb-0" : ""
        }`}
      >
        <CommissionEvalHeader sheet={sheet} isSubmitted={isSubmitted} />

        {!isSubmitted && scaleProgress ? (
          <CommissionScaleProgress progress={scaleProgress} />
        ) : null}

        {sheet.resumeFiles.length > 0 ? (
          <CommissionResumeLinks files={sheet.resumeFiles} />
        ) : null}

        <CommissionScaleSection
          questions={sheet.fixedQuestions}
          scaleOptions={scaleOptions}
          scaleAnswers={scaleAnswers}
          disabled={isSubmitted || busy}
          onSelect={updateScale}
        />

        <CommissionVariableSection
          variableAnswers={variableAnswers}
          lockedQuestions={lockedQuestions}
          bankQuestions={sheet.bankQuestions}
          reservedQuestionTexts={sheet.reservedQuestionTexts}
          disabled={isSubmitted || busy}
          onUpdate={updateVariable}
          onOpenBankPicker={setBankPickerIndex}
        />

        {bankPickerIndex !== null && !lockedQuestions && sheet.bankQuestions.length > 0 ? (
          <CommissionQuestionBankPicker
            questions={sheet.bankQuestions}
            excludedTexts={_buildExcludedBankTexts(variableAnswers, bankPickerIndex)}
            reservedByOthersCount={sheet.reservedQuestionTexts.length}
            onSelect={(text) => {
              updateVariable(bankPickerIndex, { questionText: text });
              setBankPickerIndex(null);
            }}
            onClose={() => setBankPickerIndex(null)}
          />
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-2xl bg-[#00B596]/15 px-4 py-3 text-sm font-semibold text-[#007A66]">
            {success}
          </p>
        ) : null}

        {!isSubmitted ? (
          <div className={commissionEvalStickyActionsClass}>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <Button
                variant="secondary"
                disabled={busy}
                className={commissionEvalSecondaryButtonClass}
                onClick={() => void saveDraft()}
              >
                Сохранить черновик
              </Button>
              <Button
                disabled={busy}
                className={commissionEvalPrimaryButtonClass}
                onClick={() => void submitFinal()}
              >
                Отправить
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </StepLayout>
  );
}

function CommissionEvalHeader({
  sheet,
  isSubmitted,
}: {
  sheet: CommissionEvalSheetPublicView;
  isSubmitted: boolean;
}): React.ReactElement {
  return (
    <div className={commissionEvalCardClass}>
      <h1 className={commissionEvalTitleClass}>Оценочный лист комиссии</h1>
      <dl className="mt-4 space-y-2 break-words">
        <div>
          <dt className="text-[13px] font-semibold uppercase tracking-wide text-[#8C8C8C]">
            Участник
          </dt>
          <dd className={`mt-0.5 ${commissionEvalBodyTextClass}`}>{sheet.memberName}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-semibold uppercase tracking-wide text-[#8C8C8C]">
            Кандидат
          </dt>
          <dd className={`mt-0.5 ${commissionEvalBodyTextClass}`}>{sheet.candidateName}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-semibold uppercase tracking-wide text-[#8C8C8C]">
            Вакансия
          </dt>
          <dd className={`mt-0.5 ${commissionEvalBodyTextClass}`}>{sheet.vacancyTitle}</dd>
        </div>
      </dl>
      {isSubmitted ? (
        <p className="mt-4 rounded-2xl bg-[#00B596]/15 px-4 py-3 text-sm font-semibold text-[#007A66]">
          Анкета отправлена
          {sheet.submittedAt
            ? ` ${new Date(sheet.submittedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`
            : ""}
          . Изменения недоступны.
        </p>
      ) : null}
    </div>
  );
}

function CommissionScaleProgress({ progress }: { progress: ScaleProgress }): React.ReactElement {
  const percent =
    progress.total > 0 ? Math.round((progress.filled / progress.total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white/60 px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-[#5F5E5E]">
        <span>Шкальные оценки</span>
        <span>
          {String(progress.filled)} / {String(progress.total)}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-black/10"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[#00B596] transition-[width] duration-300"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}

function CommissionResumeLinks({
  files,
}: {
  files: CommissionEvalSheetPublicView["resumeFiles"];
}): React.ReactElement {
  return (
    <div className={commissionEvalCardClass}>
      <h2 className={commissionEvalSectionTitleClass}>Резюме кандидата</h2>
      <ul className="mt-4 space-y-3">
        {files.map((file) => (
          <li key={file.id}>
            <Link
              href={file.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 max-w-full items-center break-all text-[15px] font-semibold text-[#00B596] underline-offset-2 hover:underline sm:text-[16px]"
            >
              {file.fileName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommissionScaleSection({
  questions,
  scaleOptions,
  scaleAnswers,
  disabled,
  onSelect,
}: {
  questions: CommissionEvalSheetPublicView["fixedQuestions"];
  scaleOptions: ReadonlyArray<number>;
  scaleAnswers: CommissionScaleAnswers;
  disabled: boolean;
  onSelect: (questionId: string, value: number) => void;
}): React.ReactElement {
  return (
    <div className={commissionEvalCardClass}>
      <h2 className={commissionEvalSectionTitleClass}>Шкальные вопросы (1–10)</h2>
      <p className={`mt-2 ${commissionEvalBodyTextClass}`}>
        Оцените кандидата по каждому критерию. Нажмите число от 1 до 10.
      </p>
      <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="border-b border-black/10 pb-5 last:border-0 last:pb-0"
          >
            <p className="text-[15px] font-bold leading-snug text-[#5F5E5E] sm:text-[16px]">
              <span className="mr-2 text-[#8C8C8C]">{String(index + 1)}.</span>
              {question.text}
            </p>
            <div className={commissionScaleGridClass} role="radiogroup" aria-label={question.text}>
              {scaleOptions.map((value) => {
                const selected = scaleAnswers[question.id] === value;
                return (
                  <label
                    key={value}
                    className={commissionScaleButtonClass(selected, disabled)}
                  >
                    <input
                      type="radio"
                      name={`scale-${question.id}`}
                      value={value}
                      checked={selected}
                      disabled={disabled}
                      className="sr-only"
                      onChange={() => onSelect(question.id, value)}
                    />
                    {value}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommissionVariableSection({
  variableAnswers,
  lockedQuestions,
  bankQuestions,
  reservedQuestionTexts,
  disabled,
  onUpdate,
  onOpenBankPicker,
}: {
  variableAnswers: CommissionVariableAnswer[];
  lockedQuestions: ReadonlyArray<string> | null;
  bankQuestions: CommissionEvalSheetPublicView["bankQuestions"];
  reservedQuestionTexts: CommissionEvalSheetPublicView["reservedQuestionTexts"];
  disabled: boolean;
  onUpdate: (index: number, patch: Partial<CommissionVariableAnswer>) => void;
  onOpenBankPicker: (index: number) => void;
}): React.ReactElement {
  return (
    <div className={commissionEvalCardClass}>
      <h2 className={commissionEvalSectionTitleClass}>Развёрнутые вопросы</h2>
      <p className={`mt-2 break-words ${commissionEvalBodyTextClass}`}>
        {lockedQuestions
          ? "Вопросы зафиксированы при первой отправке. Заполните заключение по каждому."
          : "Выберите или сформулируйте 2 вопроса и дайте развёрнутое заключение. Вопросы, уже выбранные другими участниками комиссии, из банка недоступны."}
      </p>
      {!lockedQuestions && reservedQuestionTexts.length > 0 ? (
        <p className="mt-3 break-words rounded-2xl bg-amber-50 px-3 py-2 text-[13px] font-medium leading-relaxed text-amber-900 sm:text-[14px]">
          {_formatReservedQuestionsNotice(reservedQuestionTexts.length)}
        </p>
      ) : null}
      <div className="mt-5 space-y-7 sm:mt-6 sm:space-y-8">
        {variableAnswers.map((item, index) => (
          <div key={index} className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#8C8C8C] sm:text-sm">
              Вопрос {index + 1}
            </p>
            {lockedQuestions ? (
              <p className="break-words rounded-2xl bg-white/70 px-4 py-3 text-[15px] leading-relaxed text-[#5F5E5E] sm:text-[16px]">
                {lockedQuestions[index]}
              </p>
            ) : (
              <div className="min-w-0 space-y-2">
                <label className={`${commissionEvalLabelClass} min-w-0`}>
                  Текст вопроса
                  <input
                    className={commissionEvalInputClass}
                    value={item.questionText}
                    disabled={disabled}
                    list={`bank-q-${String(index)}`}
                    placeholder="Свой вопрос или из банка"
                    autoComplete="off"
                    onChange={(event) => onUpdate(index, { questionText: event.target.value })}
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disabled || bankQuestions.length === 0}
                  className={commissionEvalBankButtonClass}
                  onClick={() => onOpenBankPicker(index)}
                >
                  Из банка
                </Button>
                {bankQuestions.length === 0 ? (
                  <p className="text-[13px] font-medium leading-relaxed text-amber-900 sm:text-[14px]">
                    Свободных вопросов в банке нет — введите свой вопрос в поле выше.
                  </p>
                ) : null}
                <datalist id={`bank-q-${String(index)}`}>
                  {bankQuestions.map((bankItem) => (
                    <option key={bankItem.id} value={bankItem.text} />
                  ))}
                </datalist>
              </div>
            )}
            <label className={commissionEvalLabelClass}>
              Заключение
              <textarea
                className={commissionEvalTextareaClass}
                value={item.conclusion}
                disabled={disabled}
                placeholder="Ваше заключение по этому вопросу"
                onChange={(event) => onUpdate(index, { conclusion: event.target.value })}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function _formatReservedQuestionsNotice(count: number): string {
  const label =
    count % 10 === 1 && count % 100 !== 11
      ? `${String(count)} вопрос`
      : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)
        ? `${String(count)} вопроса`
        : `${String(count)} вопросов`;
  return count === 1
    ? "1 вопрос уже занят другим участником комиссии."
    : `${label} уже заняты другими участниками комиссии.`;
}

function _buildExcludedBankTexts(
  variableAnswers: CommissionVariableAnswer[],
  activeIndex: number
): ReadonlySet<string> {
  const excluded = new Set<string>();
  variableAnswers.forEach((item, index) => {
    if (index === activeIndex) {
      return;
    }
    const text = item.questionText.trim();
    if (text) {
      excluded.add(normalizeCommissionQuestionText(text));
    }
  });
  return excluded;
}

function _emptyScaleAnswers(): CommissionScaleAnswers {
  return {};
}

function _emptyVariableAnswers(
  locked: ReadonlyArray<string> | null
): CommissionVariableAnswer[] {
  if (locked && locked.length === COMMISSION_VARIABLE_QUESTION_COUNT) {
    return locked.map((questionText) => ({ questionText, conclusion: "" }));
  }
  return Array.from({ length: COMMISSION_VARIABLE_QUESTION_COUNT }, () => ({
    questionText: "",
    conclusion: "",
  }));
}

function _buildScaleOptions(): ReadonlyArray<number> {
  const items: number[] = [];
  for (let value = COMMISSION_SCALE_MIN; value <= COMMISSION_SCALE_MAX; value += 1) {
    items.push(value);
  }
  return items;
}
