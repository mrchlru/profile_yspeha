"use client";

import { useEffect, useRef } from "react";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";

/**
 * Однократное логирование открытия шага (монтирование страницы).
 */
export function useScreeningStepLog(stepId: string, sessionId: string | null): void {
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) {
      return;
    }
    logged.current = true;
    screeningClientLog("step_mount", {
      stepId,
      sessionRef: clientSessionRef(sessionId) ?? "none",
    });
  }, [stepId, sessionId]);
}
