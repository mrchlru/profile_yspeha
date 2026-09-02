"use client";

import React from "react";
import { Button } from "@/components/Button";
import {
  stepSecondaryTextClass,
  stepSurfaceCardClass,
  stepSectionTitleClass,
  stepNavPrimaryButtonClass,
} from "@/lib/stepPageTheme";
import type { AuditStepConfig } from "@/lib/audit/auditTypes";

export type AuditStepStubBodyProps = {
  step: AuditStepConfig;
  displayStepIndex: number;
  totalSteps: number;
  /** Кнопка «Завершить шаг (заглушка)» — переход к следующему шагу. */
  onComplete: () => void;
  /**
   * Контент справа от шапки шага: обычно `AuditTimerBadge`, прилетающий из
   * `AuditStepTimerHost`. Нужен, чтобы заглушки таймерных шагов тоже умели
   * показывать живой обратный отсчёт.
   */
  rightSlot?: React.ReactNode;
};

/**
 * Временный экран «вместо настоящих вопросов»: после интро показывает мета-информацию
 * шага (тип ответа, кол-во, таймер) и кнопку «Завершить шаг», чтобы можно было пройти
 * весь маршрут от старта до финала. В следующих PR каждая такая заглушка будет
 * заменена реальной формой соответствующего теста.
 */
export function AuditStepStubBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepStubBodyProps): React.ReactElement {
  const timerLabel = _formatTimerLabel(step.timerSeconds);
  const itemCountLabel = step.itemCount === null ? "пул вопросов (плавающее)" : String(step.itemCount);

  return (
    <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
      <div className={`w-full max-w-[860px] px-8 py-8 ${stepSurfaceCardClass}`}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <p className={`text-[14px] uppercase tracking-wide ${stepSecondaryTextClass}`}>
            {`Шаг ${String(displayStepIndex)} из ${String(totalSteps)}`}
          </p>
          {rightSlot ? <div>{rightSlot}</div> : null}
        </div>
        <h2 className={stepSectionTitleClass}>Здесь будут вопросы</h2>

        <p className={`text-[18px] ${stepSecondaryTextClass}`}>
          Это каркас маршрута аудита. Реальные вопросы для этого шага будут добавлены в
          следующих PR. Пока можно убедиться, что инструкция, таймер и переход к
          следующему шагу работают корректно.
        </p>

        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <_Pair label="Тип ответа" value={step.answerKind} />
          <_Pair label="Кол-во заданий" value={itemCountLabel} />
          <_Pair label="Таймер" value={timerLabel} />
          <_Pair label="Внутренний ключ" value={step.internalKey} />
        </dl>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            onClick={onComplete}
            className={`${stepNavPrimaryButtonClass} min-w-[240px]`}
          >
            Завершить шаг (заглушка)
          </Button>
        </div>
      </div>
    </div>
  );
}

function _Pair({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[14px] text-[#4F4F4F]">
      <dt className="text-[12px] uppercase tracking-wide text-[#7F7F7F]">{label}</dt>
      <dd className="mt-1 break-words font-mono text-[14px]">{value}</dd>
    </div>
  );
}

function _formatTimerLabel(timerSeconds: number | null): string {
  if (timerSeconds === null) {
    return "без ограничения";
  }
  const minutes = Math.round(timerSeconds / 60);
  return `${String(minutes)} мин`;
}
