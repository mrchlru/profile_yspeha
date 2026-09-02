"use client";

import React, { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUDIT_STEPS, getAuditStepBySlug } from "@/lib/audit/auditSteps";
import { getAuditStepDevTitle } from "@/lib/audit/auditStepDevTitles";
import { useAuditDevNavEnabled } from "@/hooks/useAuditDevNavEnabled";
import { useAuditFormStore } from "@/store/useAuditFormStore";

function _activeRouteKind(
  pathname: string
): { readonly kind: "intro" | "finish" | "step"; readonly stepIndex: number | null } {
  if (pathname === "/audit/intro") {
    return { kind: "intro", stepIndex: null };
  }
  if (pathname === "/audit/finish") {
    return { kind: "finish", stepIndex: null };
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "audit" || segments.length !== 2) {
    return { kind: "intro", stepIndex: null };
  }
  const step = getAuditStepBySlug(segments[1] ?? "");
  if (step === null) {
    return { kind: "intro", stepIndex: null };
  }
  return { kind: "step", stepIndex: step.stepIndex };
}

/**
 * Нижняя панель быстрого перехода между шагами аудита (только при включённом dev-режиме).
 */
export function AuditDevStepNavLayer(): React.ReactElement | null {
  const enabled = useAuditDevNavEnabled();
  const pathname = usePathname();
  const router = useRouter();
  const markStepReached = useAuditFormStore((s) => s.markStepReached);
  const { kind, stepIndex: activeStepIndex } = _activeRouteKind(pathname);

  const goIntro = useCallback(() => {
    router.push("/audit/intro");
  }, [router]);

  const goFinish = useCallback(() => {
    useAuditFormStore.setState({
      submissionStatus: "idle",
      submitError: null,
      devTextReport: null,
      devEmailSent: null,
    });
    router.push("/audit/finish");
  }, [router]);

  const goStep = useCallback(
    (index: number, slug: string) => {
      markStepReached(index);
      router.push(`/audit/${slug}`);
    },
    [markStepReached, router]
  );

  if (!enabled) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[101] flex max-h-[40vh] flex-col border-t-2 border-amber-500 bg-[#1a1a1a]/95 px-2 pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm"
      role="navigation"
      aria-label="Dev: навигация по шагам аудита"
    >
      <div className="mb-1 flex shrink-0 items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
          Dev · шаги аудита
        </span>
        <span className="hidden text-[10px] text-white/55 sm:inline">
          Только в этом браузере · не для респондентов
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-1">
        <div className="flex w-max gap-1.5 pr-2">
          <button type="button" onClick={goIntro} className={_devChipClass(kind === "intro")}>
            Интро
          </button>
          {AUDIT_STEPS.map((step) => (
            <button
              key={step.slug}
              type="button"
              title={getAuditStepDevTitle(step.internalKey)}
              onClick={() => goStep(step.stepIndex, step.slug)}
              className={_devChipClass(kind === "step" && activeStepIndex === step.stepIndex)}
            >
              <span className="font-mono text-[11px] font-bold text-amber-200/95">
                {String(step.stepIndex)}
              </span>
              <span className="max-w-[140px] truncate">
                {getAuditStepDevTitle(step.internalKey)}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={goFinish}
            title="Текстовый отчёт по пройденным шагам (без PDF)"
            className={_devChipClass(kind === "finish")}
          >
            Текст. отчёт
          </button>
        </div>
      </div>
    </div>
  );
}

function _devChipClass(active: boolean): string {
  const base =
    "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-400/50 min-h-[36px]";
  const colors = active
    ? "border-amber-400 bg-amber-500/25 text-amber-50"
    : "border-white/15 bg-white/10 text-white/88 hover:bg-white/16";
  return `${base} ${colors}`;
}
