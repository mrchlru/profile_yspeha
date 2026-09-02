"use client";

import React from "react";
import { AuditTimerBadge } from "@/components/audit/AuditTimerBadge";
import { useAuditStepTimer } from "@/hooks/useAuditStepTimer";

export type AuditStepTimerHostProps = {
  stepIndex: number;
  totalSeconds: number;
  /** Колбэк, вызываемый ровно один раз при истечении таймера. */
  onExpire: () => void;
  /**
   * Render-prop: получает готовый бэйдж таймера, который вызывающая сторона
   * пробрасывает в `rightSlot` соответствующего layout'а.
   */
  children: (timerBadge: React.ReactNode) => React.ReactElement;
};

/**
 * Обёртка над `useAuditStepTimer`, изолирующая правила хуков от вызывающей
 * стороны: страница `[step]/page.tsx` монтирует этот хост только для шагов
 * с реальным таймером, и тогда render-prop отдаёт компоненту вопросов готовый
 * `AuditTimerBadge` для отображения в шапке.
 */
export function AuditStepTimerHost({
  stepIndex,
  totalSeconds,
  onExpire,
  children,
}: AuditStepTimerHostProps): React.ReactElement {
  const { secondsLeft } = useAuditStepTimer({
    stepIndex,
    totalSeconds,
    onExpire,
  });
  const badge = (
    <AuditTimerBadge secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
  );
  return children(badge);
}
