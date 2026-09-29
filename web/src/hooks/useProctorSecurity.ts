"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useProctorBinding } from "@/hooks/useProctorBinding";
import {
  PROCTOR_EVENT_FULLSCREEN_EXIT,
  PROCTOR_EVENT_TAB_HIDDEN,
  PROCTOR_EVENT_WINDOW_BLUR,
  type SecurityProctorEventKind,
} from "@/lib/proctor/proctorEventKinds";
import { proctorStepMetadata } from "@/lib/proctor/proctorStepContext";
import {
  isProctorFullscreenActive,
  requestProctorFullscreen,
} from "@/lib/proctor/requestProctorFullscreen";

export type ProctorSecurityState = {
  violationBanner: string | null;
  clearBanner: () => void;
  requestFullscreen: () => Promise<boolean>;
  isFullscreen: boolean;
};

const EVENT_COOLDOWN_MS = 3000;

const EVENT_LABELS: Record<SecurityProctorEventKind, string> = {
  [PROCTOR_EVENT_TAB_HIDDEN]: "Вкладка скрыта — зафиксировано",
  [PROCTOR_EVENT_FULLSCREEN_EXIT]: "Выход из полноэкранного режима — зафиксировано",
  [PROCTOR_EVENT_WINDOW_BLUR]: "Окно потеряло фокус — зафиксировано",
};

/**
 * Полноэкранный режим и фиксация выхода / сворачивания / потери фокуса.
 * Паттерн как в проекте «Античит Код».
 */
export function useProctorSecurity(enabled: boolean): ProctorSecurityState {
  const { sessionId, accessCode } = useProctorBinding();
  const [violationBanner, setViolationBanner] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastSentRef = useRef<Partial<Record<SecurityProctorEventKind, number>>>({});
  const sessionIdRef = useRef(sessionId);
  const accessCodeRef = useRef(accessCode);
  sessionIdRef.current = sessionId;
  accessCodeRef.current = accessCode;

  const postEvent = useCallback(
    async (kind: SecurityProctorEventKind): Promise<void> => {
      const sid = sessionIdRef.current;
      const code = accessCodeRef.current;
      if (!sid || !code) {
        return;
      }
      const now = Date.now();
      const last = lastSentRef.current[kind] ?? 0;
      if (now - last < EVENT_COOLDOWN_MS) {
        return;
      }
      lastSentRef.current[kind] = now;
      setViolationBanner(EVENT_LABELS[kind]);

      try {
        await fetch("/api/proctor/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            accessCode: code,
            events: [
              {
                clientEventId: `${kind}-${String(now)}`,
                kind,
                occurredAt: new Date().toISOString(),
                metadata: proctorStepMetadata(),
              },
            ],
          }),
        });
      } catch {
        // сеть может пропасть — событие не критично для UI
      }
    },
    []
  );

  const requestFullscreen = useCallback(async (): Promise<boolean> => {
    const ok = await requestProctorFullscreen();
    setIsFullscreen(ok || isProctorFullscreenActive());
    return ok;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setIsFullscreen(isProctorFullscreenActive());
    void requestFullscreen();

    function onVisibility(): void {
      if (document.visibilityState === "hidden") {
        void postEvent(PROCTOR_EVENT_TAB_HIDDEN);
      }
    }

    function onBlur(): void {
      if (document.visibilityState === "hidden") {
        return;
      }
      void postEvent(PROCTOR_EVENT_WINDOW_BLUR);
    }

    function onFullscreen(): void {
      const active = isProctorFullscreenActive();
      setIsFullscreen(active);
      if (!active) {
        void postEvent(PROCTOR_EVENT_FULLSCREEN_EXIT);
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [enabled, postEvent, requestFullscreen]);

  function clearBanner(): void {
    setViolationBanner(null);
  }

  return { violationBanner, clearBanner, requestFullscreen, isFullscreen };
}
