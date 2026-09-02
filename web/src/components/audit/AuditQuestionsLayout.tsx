"use client";

import React from "react";
import { Button } from "@/components/Button";
import {
  auditTimerBadgeFixedClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
  stepSectionTitleClass,
  stepNavPrimaryButtonClass,
} from "@/lib/stepPageTheme";

export type AuditQuestionsLayoutProps = {
  /** Номер шага, для подзаголовка «Шаг N из total». */
  stepIndex: number;
  /** Всего шагов в маршруте. */
  totalSteps: number;
  /** Кол-во отвеченных вопросов (для прогресса). */
  answered: number;
  /** Общее число вопросов в шаге. */
  total: number;
  /** Содержимое: карточки вопросов конкретного теста. */
  children: React.ReactNode;
  /** Доступна ли кнопка «Завершить шаг». Обычно — `answered === total`. */
  canComplete: boolean;
  /** Хэндлер кнопки «Завершить шаг». */
  onComplete: () => void;
  /** Лейбл кнопки. По умолчанию «Завершить шаг». */
  completeLabel?: string;
  /** Опциональный slot справа от заголовка (например, бэйдж таймера). */
  rightSlot?: React.ReactNode;
  /**
   * Показывать ли кнопку «Завершить шаг». По умолчанию — `true`.
   * Для шагов с пулом вопросов и таймером (например, шаг 24) логика
   * завершения управляется таймером, поэтому ручной кнопкой не пользуемся,
   * пока пул не исчерпан.
   */
  showCompleteButton?: boolean;
  /**
   * Заменяет дефолтную метку «Отвечено: N из M» в шапке прогресс-бара.
   * Нужно, например, шагу с пулом, где удобнее показывать «Вопрос N из M».
   */
  progressLeftLabel?: string;
  /**
   * Опциональный контент под прогресс-баром (поясняющая подпись,
   * например — «Время отсчитывается на всех 18 минут, отвечайте до сигнала.»).
   */
  belowProgress?: React.ReactNode;
};

/**
 * Общая обёртка экрана с вопросами шага аудита: шапка с номером шага и прогрессом,
 * слот для UI-компонента конкретного теста и кнопка «Завершить шаг».
 *
 * Сам прогресс-бар и кнопка одинаковы для всех тестов аудита, поэтому вынесены сюда
 * и переиспользуются всеми компонентами `Audit<...>List` / `Audit<...>Choice`.
 */
export function AuditQuestionsLayout({
  stepIndex,
  totalSteps,
  answered,
  total,
  children,
  canComplete,
  onComplete,
  completeLabel = "Завершить шаг",
  rightSlot,
  showCompleteButton = true,
  progressLeftLabel,
  belowProgress,
}: AuditQuestionsLayoutProps): React.ReactElement {
  const percent = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;

  return (
    <div className="flex flex-1 justify-center px-4 pb-10 pt-2">
      {rightSlot ? (
        <div className={auditTimerBadgeFixedClass} aria-live="polite">
          {rightSlot}
        </div>
      ) : null}
      <div className={`w-full max-w-[860px] px-6 py-6 sm:px-8 sm:py-8 ${stepSurfaceCardClass}`}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <p className={`text-[14px] uppercase tracking-wide ${stepSecondaryTextClass}`}>
            {`Шаг ${String(stepIndex)} из ${String(totalSteps)}`}
          </p>
        </div>
        <h2 className={stepSectionTitleClass}>Ответьте на каждый вопрос</h2>

        <_ProgressRow
          answered={answered}
          total={total}
          percent={percent}
          leftLabel={progressLeftLabel}
        />
        {belowProgress ? <div className="mt-3">{belowProgress}</div> : null}

        <div className="mt-6 space-y-4">{children}</div>

        {showCompleteButton ? (
          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <Button
              onClick={onComplete}
              disabled={!canComplete}
              className={`${stepNavPrimaryButtonClass} min-w-[220px]`}
            >
              {completeLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function _ProgressRow({
  answered,
  total,
  percent,
  leftLabel,
}: {
  answered: number;
  total: number;
  percent: number;
  leftLabel: string | undefined;
}): React.ReactElement {
  const left = leftLabel ?? `Отвечено: ${String(answered)} из ${String(total)}`;
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[13px] text-[#5F5E5E]">
        <span>{left}</span>
        <span>{`${String(percent)}%`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[#00B596] transition-[width] duration-200"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}
