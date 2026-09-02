"use client";

import { useEffect, useRef, useState } from "react";
import { useAuditFormStore } from "@/store/useAuditFormStore";

export type UseAuditStepTimerArgs = {
  /** Номер шага аудита (1..AUDIT_TOTAL_STEPS). */
  stepIndex: number;
  /** Полный лимит шага в секундах. */
  totalSeconds: number;
  /**
   * Колбэк, вызываемый ровно один раз, когда таймер истекает.
   * На стороне страницы шага он обычно дергает `handleCompleteStep`
   * для автоматического перехода к следующему шагу.
   */
  onExpire: () => void;
};

export type UseAuditStepTimerResult = {
  /** Оставшееся время в секундах. Никогда не ниже 0. */
  secondsLeft: number;
  /** Полный лимит (прокидывается для удобства badge'а). */
  totalSeconds: number;
};

/**
 * Хук обратного отсчёта для шагов аудита с таймером (CFIT, Кейрси, Томас,
 * Герчиков, Почебут, КОС-1, эрудиция). Запоминает момент старта в persist-сторе,
 * чтобы перезагрузка страницы не сбрасывала отсчёт, и вызывает `onExpire` ровно
 * один раз при достижении нуля.
 *
 * Хук рассчитан на монтирование только когда у шага реально есть таймер
 * (`step.timerSeconds !== null`) и пользователь находится в фазе вопросов.
 * Условный рендер хука гарантирует страница `[step]/page.tsx` через обёртку
 * `AuditStepTimerHost`.
 */
export function useAuditStepTimer({
  stepIndex,
  totalSeconds,
  onExpire,
}: UseAuditStepTimerArgs): UseAuditStepTimerResult {
  const startedAt = useAuditFormStore(
    (s) => s.timerStartedAt[stepIndex] ?? null
  );
  const startStepTimer = useAuditFormStore((s) => s.startStepTimer);

  const onExpireRef = useRef<() => void>(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const expiredForStepRef = useRef<number | null>(null);

  useEffect(() => {
    if (startedAt === null) {
      startStepTimer(stepIndex);
    }
  }, [stepIndex, startedAt, startStepTimer]);

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const effectiveStart = startedAt ?? now;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - effectiveStart) / 1000)
  );
  const secondsLeft = Math.max(0, totalSeconds - elapsedSeconds);

  useEffect(() => {
    if (startedAt === null) {
      return;
    }
    if (secondsLeft > 0) {
      return;
    }
    if (expiredForStepRef.current === stepIndex) {
      return;
    }
    expiredForStepRef.current = stepIndex;
    onExpireRef.current();
  }, [secondsLeft, startedAt, stepIndex]);

  return { secondsLeft, totalSeconds };
}
