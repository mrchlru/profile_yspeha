"use client";

import React, { useEffect, useState } from "react";

import {
  getSyncOutboxPendingCount,
  subscribeSyncOutbox,
} from "@/lib/sync/syncOutbox";

type ConnectionQuality = "stable" | "unstable" | "offline";

function WifiIcon({ className }: { className: string }): React.ReactElement {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 20h.01M8.5 16.42a5.5 5.5 0 017 0M5.5 13.19a9.5 9.5 0 0113 0M2 9.96a13.5 13.5 0 0120 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Компактный индикатор качества связи и очереди sync (скрининг / батарея).
 */
export function ConnectionStatusPill(): React.ReactElement | null {
  const [quality, setQuality] = useState<ConnectionQuality>("stable");
  const [pending, setPending] = useState(0);
  const [showVpnHint, setShowVpnHint] = useState(false);

  useEffect(() => {
    return subscribeSyncOutbox(setPending);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probe(): Promise<void> {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (!cancelled) {
          setQuality("offline");
          setShowVpnHint(false);
        }
        return;
      }
      const started = performance.now();
      try {
        const res = await fetch("/api/ping", { cache: "no-store" });
        const elapsed = performance.now() - started;
        if (!res.ok) {
          if (!cancelled) {
            setQuality("unstable");
          }
          return;
        }
        if (!cancelled) {
          setQuality(elapsed > 2500 ? "unstable" : "stable");
        }
      } catch {
        if (!cancelled) {
          setQuality("unstable");
        }
      }
    }

    void probe();
    const id = window.setInterval(() => void probe(), 12_000);
    window.addEventListener("online", probe);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("online", probe);
    };
  }, []);

  useEffect(() => {
    setShowVpnHint(
      (quality === "unstable" || quality === "offline") &&
        (pending > 0 || getSyncOutboxPendingCount() > 0)
    );
  }, [quality, pending]);

  const unstable = quality === "unstable" || quality === "offline" || pending > 0;

  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-[70] flex max-w-[min(100vw-1.5rem,20rem)] flex-col items-end gap-1 sm:right-4 sm:top-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-tight shadow-sm backdrop-blur-sm sm:text-xs ${
          unstable
            ? "border-red-400/35 bg-red-500/12 text-red-900"
            : "border-emerald-400/35 bg-emerald-500/12 text-emerald-900"
        }`}
      >
        <WifiIcon className={unstable ? "text-red-600" : "text-emerald-600"} />
        <span>
          {quality === "offline"
            ? "Нет сети. Ответы в очереди."
            : unstable
              ? "Интернет нестабилен. Ответы могут не сохраниться."
              : "Интернет-соединение стабильно."}
        </span>
      </div>
      {showVpnHint ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow-sm backdrop-blur-sm sm:text-[11px]">
          VPN — выключите VPN
        </div>
      ) : null}
    </div>
  );
}