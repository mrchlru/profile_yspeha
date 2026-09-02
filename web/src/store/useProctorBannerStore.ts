"use client";

import { create } from "zustand";

type ProctorBannerStore = {
  bannerVisible: boolean;
  setBannerVisible: (visible: boolean) => void;
};

/** Глобальный флаг видимости жёлтой полосы прокторинга (для отступа layout). */
export const useProctorBannerStore = create<ProctorBannerStore>((set) => ({
  bannerVisible: false,
  setBannerVisible: (visible) => set({ bannerVisible: visible }),
}));
