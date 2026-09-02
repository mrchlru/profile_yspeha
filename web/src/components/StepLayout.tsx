"use client";

import React from "react";

import { FaqMenu } from "@/components/FaqMenu";
import { BtsBrandLogoLink } from "@/components/BtsBrandLogoLink";
import { MetaballBackground } from "@/components/MetaballBackground";
import { ProctorMonitor } from "@/components/proctor/ProctorMonitor";
import { useProctorUiActive } from "@/hooks/useProctorUiActive";
import { useScreeningNoSelect } from "@/hooks/useScreeningNoSelect";
import { screeningNoSelectContentClass } from "@/lib/stepPageTheme";

export type StepLayoutProps = {
  children: React.ReactNode;
  hideHeaderTitle?: boolean;
  /** Уменьшенная шапка на телефонах (оценочный лист комиссии и др.). */
  compactHeader?: boolean;
};

/**
 * Общая оболочка экранов.
 * Контент по ширине ограничен max-w в шапке; фон тянется на всю ширину.
 * Высота по контенту: длинные шаги опроса прокручиваются страницей.
 */
export function StepLayout({
  children,
  hideHeaderTitle = false,
  compactHeader = false,
}: StepLayoutProps): React.ReactElement {
  const screeningNoSelect = useScreeningNoSelect();
  const proctorUiActive = useProctorUiActive();

  return (
    <div
      className={`relative flex min-h-screen flex-col bg-[#F2F2F2] ${
        proctorUiActive ? "pt-9" : ""
      }`}
    >
      <MetaballBackground />

      <header className="relative z-50 w-full shrink-0">
        <div
          className={`mx-auto flex w-full max-w-[1512px] items-start justify-between ${
            compactHeader
              ? "px-3 pt-3 sm:px-6 sm:pt-5 lg:px-[24px] lg:pt-[20px]"
              : "px-[24px] pt-[20px]"
          }`}
        >
          <div
            className={`relative shrink-0 ${
              compactHeader
                ? "h-[48px] w-[48px] sm:h-[56px] sm:w-[56px]"
                : "h-[56px] w-[56px]"
            }`}
          >
            <BtsBrandLogoLink
              width={128}
              height={128}
              priority
              className="block h-full w-full"
            />
          </div>

          {!hideHeaderTitle ? (
            <h1 className="absolute left-1/2 top-[28px] -translate-x-1/2 whitespace-nowrap text-[38px] font-extrabold leading-none text-[#8C8C8C]">
              Профиль Успеха
            </h1>
          ) : null}

          <FaqMenu />
        </div>
      </header>

      <main
        className={`relative z-10 flex w-full min-w-0 flex-1 flex-col overflow-x-hidden ${
          screeningNoSelect ? screeningNoSelectContentClass : ""
        }`}
      >
        {children}
      </main>

      <ProctorMonitor />
    </div>
  );
}
