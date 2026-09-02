"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getKotUnansweredCount } from "@/lib/kot/kotUnansweredCount";
import { useFormStore } from "@/store/useFormStore";

export const KOT_DURATION_MS = 20 * 60 * 1000;

const KotBlockAnswersContext = createContext<boolean>(true);

const KotRemainingMsContext = createContext<number>(KOT_DURATION_MS);

export function useKotBlockAnswersFromTimer(): boolean {
  return useContext(KotBlockAnswersContext);
}

function formatKotClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function KotTimerSticky(): React.ReactElement {
  const remainingMs = useContext(KotRemainingMsContext);
  const blockAnswers = useContext(KotBlockAnswersContext);
  const step1Data = useFormStore((s) => s.step1Data);
  const unanswered = getKotUnansweredCount(step1Data);

  return (
    <div
      className="sticky top-0 z-30 mb-4 flex flex-col items-center justify-center gap-1 border-b border-black/10 bg-[#F2F2F2]/95 py-3 backdrop-blur-sm"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-[#1a1a1a]">
        КОТ — осталось времени:{" "}
        <span
          className={`inline-block min-w-[4.5rem] font-mono text-lg tabular-nums ${
            blockAnswers ? "text-red-600" : "text-[#00B596]"
          }`}
        >
          {formatKotClock(remainingMs)}
        </span>
      </p>
      {blockAnswers ? null : (
        <p className="text-center text-xs text-[#5F5E5E]">
          Осталось без ответа:{" "}
          <span className="font-semibold text-[#1a1a1a]">{String(unanswered)}</span> из 50
        </p>
      )}
      {blockAnswers ? (
        <p className="text-center text-xs text-red-600/90">
          Отведённое время истекло. Переходим к следующему блоку…
        </p>
      ) : null}
    </div>
  );
}

/**
 * Таймер КОТ и контекст блокировки ответов. Остаток секунд в отдельном контексте,
 * чтобы список вопросов не перерисовывался каждую секунду.
 */
export function KotTimingProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const kotTimerStartedAt = useFormStore((s) => s.kotTimerStartedAt);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!kotTimerStartedAt) {
      return;
    }
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [kotTimerStartedAt]);

  const { remainingMs, blockAnswers } = useMemo(() => {
    void tick;
    if (!kotTimerStartedAt) {
      return { remainingMs: KOT_DURATION_MS, blockAnswers: true };
    }
    const t0 = Date.parse(kotTimerStartedAt);
    if (Number.isNaN(t0)) {
      return { remainingMs: KOT_DURATION_MS, blockAnswers: true };
    }
    const ms = Math.max(0, KOT_DURATION_MS - (Date.now() - t0));
    return { remainingMs: ms, blockAnswers: ms <= 0 };
  }, [kotTimerStartedAt, tick]);

  return (
    <KotBlockAnswersContext.Provider value={blockAnswers}>
      <KotRemainingMsContext.Provider value={remainingMs}>{children}</KotRemainingMsContext.Provider>
    </KotBlockAnswersContext.Provider>
  );
}
