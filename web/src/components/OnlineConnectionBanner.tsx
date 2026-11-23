"use client";

import React, { useEffect, useState } from "react";

import { UNSTABLE_CONNECTION_MESSAGE } from "@/lib/sync/unstableConnection";

/**
 * Полоса предупреждения при потере интернета во время теста.
 */
export function OnlineConnectionBanner(): React.ReactElement | null {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = (): void => {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[200] border-b border-[#E8A5A5] bg-[#FFF3F3] px-4 py-3 text-center text-[15px] font-medium text-[#8B2E2E]"
    >
      {UNSTABLE_CONNECTION_MESSAGE}
    </div>
  );
}