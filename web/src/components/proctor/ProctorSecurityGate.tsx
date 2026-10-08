"use client";

import React, { useEffect } from "react";

import { useProctorSecurityEnabled } from "@/hooks/useProctorIntro";
import { useProctorSecurity } from "@/hooks/useProctorSecurity";

/**
 * Оболочка безопасности: fullscreen + фиксация нарушений + янтарный баннер.
 * По образцу ExamSecurityGate из «Античит Код».
 */
export function ProctorSecurityGate(): React.ReactElement | null {
  const enabled = useProctorSecurityEnabled();
  const { violationBanner, clearBanner, requestFullscreen, isFullscreen } =
    useProctorSecurity(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void requestFullscreen();
  }, [enabled, requestFullscreen]);

  if (!enabled) {
    return null;
  }

  const showBanner = Boolean(violationBanner) || !isFullscreen;

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[110] border-b border-amber-500/70 bg-amber-400 px-3 py-2 text-center text-[13px] font-semibold text-amber-950 shadow-sm sm:text-[14px]"
      role="alert"
    >
      <span>
        {violationBanner ??
          "Включите полноэкранный режим для прохождения теста."}
      </span>
      <button
        type="button"
        className="ml-3 underline underline-offset-2"
        onClick={() => {
          clearBanner();
          void requestFullscreen();
        }}
      >
        Вернуться в полноэкранный режим
      </button>
    </div>
  );
}
