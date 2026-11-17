"use client";

import React from "react";

import { SyncOutboxBootstrap } from "@/components/SyncOutboxBootstrap";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";

/**
 * Фоновая догонка очереди sync во время прохождения теста.
 */
export function TestSessionUiChrome(): React.ReactElement | null {
  const hydrated = useFormStoreHydrated();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  if (!hydrated || validatedAccessCode === null) {
    return null;
  }
  return <SyncOutboxBootstrap />;
}