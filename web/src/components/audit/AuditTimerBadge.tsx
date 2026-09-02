"use client";

import React from "react";

export type AuditTimerBadgeProps = {
  /** Остаток секунд. Если `null` — таймер ещё не запущен (показывается полный лимит). */
  secondsLeft: number | null;
  /** Полный лимит шага в секундах. Используется для отображения, когда `secondsLeft === null`. */
  totalSeconds: number;
};

/**
 * Бэйдж обратного отсчёта для тестов аудита с таймером (CFIT, Кейрси, Томас,
 * Герчиков, Почебут, КОС-1, эрудиция).
 *
 * Компонент отрисовывает «MM:SS» и подсвечивается красным при `secondsLeft <= 60`.
 * Сам отсчёт ведётся в `useAuditStepTimer`; страница шага монтирует
 * `AuditStepTimerHost`, который рассчитывает `secondsLeft` и подставляет его
 * сюда. Если `secondsLeft === null` (хост ещё не подключён), показывается
 * полный лимит шага — это поведение нужно для совместимости с обычным
 * визуальным предпросмотром бэйджа без активного таймера.
 */
export function AuditTimerBadge({
  secondsLeft,
  totalSeconds,
}: AuditTimerBadgeProps): React.ReactElement {
  const display = _formatMmSs(secondsLeft ?? totalSeconds);
  const isLow = secondsLeft !== null && secondsLeft <= 60;
  const tone = isLow
    ? "bg-[#FFEDEC] text-[#C2362A] border-[#F4B7B3]"
    : "bg-white/80 text-[#5F5E5E] border-black/10";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[14px] font-extrabold leading-none ${tone}`}
      aria-label="Оставшееся время на шаг"
    >
      <span aria-hidden>⏱</span>
      <span className="tabular-nums">{display}</span>
    </span>
  );
}

function _formatMmSs(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
