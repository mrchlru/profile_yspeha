"use client";

import { useProctorMonitorEnabled } from "@/hooks/useProctorIntro";
import { useProctorBannerStore } from "@/store/useProctorBannerStore";

/** Нужно ли резервировать место под жёлтую полосу прокторинга. */
export function useProctorUiActive(): boolean {
  const monitorEnabled = useProctorMonitorEnabled();
  const bannerVisible = useProctorBannerStore((s) => s.bannerVisible);
  return monitorEnabled && bannerVisible;
}
