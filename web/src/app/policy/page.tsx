"use client";

import React from "react";
import { StepLayout } from "@/components/StepLayout";
import { useScreeningStepLog } from "@/lib/logging/useScreeningStepLog";
import {
  stepPageContentClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";

export default function PolicyPage(): React.ReactElement {
  useScreeningStepLog("policy", null);

  return (
    <StepLayout hideHeaderTitle>
      <div className={stepPageContentClass}>
        <div className={`${stepSurfaceCardClass} px-6 py-6 sm:px-8 sm:py-8`}>
          <h1 className="mb-4 text-[28px] font-extrabold leading-tight text-[#8C8C8C] sm:text-[32px]">
            Политика обработки персональных данных
          </h1>
          <p className={stepSecondaryTextClass}>
            Здесь разместите официальный текст политики. Этот экран добавлен как
            точка перехода с welcome-формы и может быть заменен на вашу полную
            юридическую страницу.
          </p>
        </div>
      </div>
    </StepLayout>
  );
}
