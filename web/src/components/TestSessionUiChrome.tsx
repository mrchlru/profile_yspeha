"use client";

import React from "react";

import { OnlineConnectionBanner } from "@/components/OnlineConnectionBanner";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";

/**
 * Предупреждение при потере сети во время прохождения теста.
 */
export function TestSessionUiChrome(): React.ReactElement | null {
  const hydrated = useFormStoreHydrated();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  if (!hydrated || validatedAccessCode === null) {
    return null;
  }
  return <OnlineConnectionBanner />;
}