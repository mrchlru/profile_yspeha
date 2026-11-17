"use client";

import { useEffect } from "react";

import { drainSyncOutbox } from "@/lib/sync/syncOutbox";

/**
 * Периодически и при online догоняет очередь sync.
 */
export function SyncOutboxBootstrap(): null {
  useEffect(() => {
    void drainSyncOutbox();
    const onOnline = (): void => {
      void drainSyncOutbox();
    };
    window.addEventListener("online", onOnline);
    const id = window.setInterval(() => {
      void drainSyncOutbox();
    }, 20_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, []);
  return null;
}