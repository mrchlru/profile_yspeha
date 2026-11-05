"use client";

import React from "react";

import { surveyPageBgClass } from "@/lib/survey/surveyConstructorTheme";

export type CustomSurveyRespondentLayoutProps = {
  children: React.ReactNode;
  /** На lg+ вертикально центрирует содержимое (экраны «Добро пожаловать» / «Спасибо»). */
  centerOnDesktop?: boolean;
};

/**
 * Оболочка прохождения опроса: широкая вёрстка для ПК, без лишних элементов скрининга.
 */
export function CustomSurveyRespondentLayout({
  children,
  centerOnDesktop = false,
}: CustomSurveyRespondentLayoutProps): React.ReactElement {
  return (
    <div className={`min-h-screen ${surveyPageBgClass}`}>
      <div
        className={`mx-auto flex w-full max-w-[1040px] flex-col px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 ${
          centerOnDesktop ? "min-h-screen" : ""
        }`}
      >
        {centerOnDesktop ? (
          <div className="flex flex-1 flex-col lg:items-center lg:justify-center">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
